<?php

namespace App\Domain\Properties;

use App\Contract\Contract;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;
use App\Support\Validation\SchemaValidator;
use Illuminate\Support\Facades\DB;

/**
 * `POST /admin/properties/bulk` (05_BUSINESS_RULES.md → "Bulk actions").
 *
 * The flag actions — activate, deactivate, feature, unfeature, verify,
 * unverify — and delete, plus five that carry a value in `payload` (prompt
 * 51): what the desk changes across a batch of listings on a busy day —
 * availability after a sale, the advisor when somebody leaves, a locality, a
 * type or a developer entered wrongly on a dozen listings.
 *
 * "Activate" asks the publish rules of every listing it would put live, all
 * or nothing, so the editor sees one list of what is missing rather than half
 * a batch published. A payload action is validated whole before anything is
 * written, and counts only the listings whose value changed.
 */
final class PropertyBulk
{
    /** The actions that set flags; `delete` deletes. */
    private const ACTIONS = [
        'activate' => ['isActive' => true],
        'deactivate' => ['isActive' => false],
        'feature' => ['isFeatured' => true],
        'unfeature' => ['isFeatured' => false],
        'verify' => ['isVerified' => true],
        'unverify' => ['isVerified' => false],
        'delete' => null,
    ];

    /**
     * The actions that carry a value: `key` is the payload's key, `collection`
     * where an id must exist, `nullable` whether `null` clears it, `activeOnly`
     * whether a switched-off record is refused.
     */
    private const PAYLOAD_ACTIONS = [
        'availability' => ['key' => 'availability'],
        'assignAgent' => ['key' => 'agentId', 'collection' => 'teamMembers', 'nullable' => true, 'activeOnly' => true],
        'setLocality' => ['key' => 'localityId', 'collection' => 'localities'],
        'setPropertyType' => ['key' => 'propertyTypeId', 'collection' => 'propertyTypes'],
        'setDeveloper' => ['key' => 'developerId', 'collection' => 'developers', 'nullable' => true],
    ];

    public function __construct(private DocumentStore $store, private PropertyWriter $writer) {}

    /**
     * @return array{0: string, 1: array{affected: int}} the message and its data
     */
    public function apply(array $body, ?array $user): array
    {
        SchemaValidator::validate(Contract::schema('bulk'), $body);
        $action = $body['action'];
        if (! isset(self::PAYLOAD_ACTIONS[$action]) && ! array_key_exists($action, self::ACTIONS)) {
            ApiLog::info('properties', "Bulk {$action} refused: not an action of the listings");

            throw ApiException::validation(['action' => 'The selected action is invalid.']);
        }

        return DB::transaction(function () use ($body, $action, $user) {
            $ids = array_map(fn ($id) => Js::string($id), $body['ids']);
            $targets = array_values(array_filter(
                $this->store->all('properties'),
                fn (array $property) => in_array(Js::string($property['id']), $ids, true),
            ));

            if (isset(self::PAYLOAD_ACTIONS[$action])) {
                $affected = $this->applyPayload($action, $body['payload'] ?? null, $targets, $user);
                $verb = 'updated';
            } else {
                $affected = $this->applyAction($action, $targets, $user);
                $verb = $action === 'delete' ? 'deleted' : 'updated';
            }
            ApiLog::info('properties', "Bulk {$action}: {$affected} affected", ['ids' => $body['ids']]);

            return [$affected.' '.($affected === 1 ? 'property' : 'properties')." {$verb}.", ['affected' => $affected]];
        });
    }

    /** A flag action or delete on every listing the ids name; each one counts. */
    private function applyAction(string $action, array $targets, ?array $user): int
    {
        if ($action === 'activate') {
            $this->refuseUnreadyBatch($targets);
        }

        if ($action === 'delete') {
            foreach ($targets as $property) {
                $this->writer->remove($property);
            }

            return count($targets);
        }

        $now = Clock::nowIso();
        foreach ($targets as $property) {
            $updated = [...$property, ...self::ACTIONS[$action], 'updatedBy' => $user['id'] ?? null, 'updatedAt' => $now];
            if (($updated['isActive'] ?? false) && ! ($updated['publishedAt'] ?? null)) {
                $updated['publishedAt'] = $now;
            }
            $this->writer->update($updated, $property);
        }

        return count($targets);
    }

    /**
     * The publish rules of every listing "activate" would put live; one that
     * is already live is not asked — activating it changes nothing.
     *
     * @throws ApiException 422 naming each listing and what it lacks
     */
    private function refuseUnreadyBatch(array $targets): void
    {
        $refused = [];
        foreach ($targets as $property) {
            if (($property['isActive'] ?? null) === true) {
                continue;
            }
            $gaps = PropertyRules::gaps(PropertyRules::problems($property), $property);
            if ($gaps !== []) {
                $refused[] = ['property' => $property, 'gaps' => $gaps];
            }
        }
        if ($refused === []) {
            return;
        }

        $message = count($refused) === 1
            ? PropertyRules::notReadyMessage($refused[0]['property'], $refused[0]['gaps'])
            : count($refused).' of the selected properties are not ready to go live, so none was activated.';
        ApiLog::info('properties', 'Bulk activate refused', ['ids' => array_map(fn (array $entry) => $entry['property']['id'], $refused)]);

        throw ApiException::validation(
            ['ids' => array_map(fn (array $entry) => '“'.Js::string($entry['property']['title'] ?? null).'”: '.implode(', ', $entry['gaps']).'.', $refused)],
            $message,
            ['notReady' => array_map(fn (array $entry) => [
                'id' => $entry['property']['id'],
                'title' => $entry['property']['title'] ?? null,
                'gaps' => $entry['gaps'],
            ], $refused)],
        );
    }

    /**
     * One of the payload actions across a batch. An id that names nothing, an
     * advisor who is switched off, or a type from another segment refuses the
     * whole batch with 422: a type moves a listing between residential and
     * commercial only through the form, where the fields that differ are
     * asked for.
     *
     * @return int how many listings changed; one already so is not counted
     */
    private function applyPayload(string $action, mixed $payload, array $targets, ?array $user): int
    {
        $rule = self::PAYLOAD_ACTIONS[$action];
        $field = "payload.{$rule['key']}";
        $refuse = function (string $message) use ($action, $field): ApiException {
            ApiLog::info('properties', "Bulk {$action} refused", [$field => $message]);

            return ApiException::validation([$field => $message]);
        };

        $value = Js::get($payload, $rule['key']);
        if (! Js::has($payload, $rule['key']) || ($value === null && ! ($rule['nullable'] ?? false))) {
            throw $refuse("The {$field} field is required.");
        }

        $record = null;
        if ($action === 'availability') {
            if (! in_array($value, Contract::enumValues('AVAILABILITY'), true)) {
                throw $refuse('The selected availability is invalid.');
            }
        } elseif ($value !== null) {
            if (! Js::isInteger($value)) {
                throw $refuse("The {$field} must be an integer.");
            }
            $record = $this->store->find($rule['collection'], $value) ?? throw $refuse("The selected {$field} is invalid.");
            if (($rule['activeOnly'] ?? false) && ($record['isActive'] ?? null) === false) {
                throw $refuse(Js::string($record['name'] ?? null).' is switched off in Team.');
            }
        }

        if ($action === 'setPropertyType') {
            $other = count(array_filter($targets, fn (array $property) => ($property['segment'] ?? null) !== ($record['segment'] ?? null)));
            if ($other > 0) {
                throw $refuse(Js::string($record['name'] ?? null).' is a '.Js::string($record['segment'] ?? null)
                    ." type, and {$other} of the selected ".($other === 1 ? 'listing is' : 'listings are')
                    .' not — change '.($other === 1 ? 'it' : 'those').' in the form.');
            }
        }

        $now = Clock::nowIso();
        $affected = 0;
        foreach ($targets as $property) {
            if (PropertyReads::sameId(self::read($action, $property) ?? '', $value ?? '')) {
                continue;
            }
            $updated = [...self::write($action, $property, $value, $record), 'updatedBy' => $user['id'] ?? null, 'updatedAt' => $now];
            $this->writer->update($updated, $property);
            $affected++;
        }

        return $affected;
    }

    /** What a payload action reads off a listing. */
    private static function read(string $action, array $property): mixed
    {
        return match ($action) {
            'availability' => $property['availability'] ?? null,
            'assignAgent' => Js::get($property['agent'] ?? null, 'teamMemberId'),
            'setLocality' => Js::get($property['location'] ?? null, 'localityId'),
            'setPropertyType' => $property['propertyTypeId'] ?? null,
            'setDeveloper' => Js::get($property['project'] ?? null, 'developerId'),
        };
    }

    /**
     * The listing with the value written: the advisor's contact details typed
     * on the listing stay; a locality moves the listing to its city.
     */
    private static function write(string $action, array $property, mixed $value, ?array $record): array
    {
        switch ($action) {
            case 'availability':
                $property['availability'] = $value;
                break;
            case 'assignAgent':
                $property['agent'] = [...Js::entries($property['agent'] ?? null), 'teamMemberId' => $value];
                break;
            case 'setLocality':
                $location = Js::entries($property['location'] ?? null);
                $property['location'] = [...$location, 'localityId' => $value, 'cityId' => $record['cityId'] ?? $location['cityId'] ?? null];
                break;
            case 'setPropertyType':
                $property['propertyTypeId'] = $value;
                break;
            case 'setDeveloper':
                $property['project'] = [...Js::entries($property['project'] ?? null), 'developerId' => $value];
                break;
        }

        return $property;
    }
}
