<?php

namespace Tests\Unit;

use App\Support\Auth\RoutePermissions;
use App\Support\Js;
use App\Support\Query\Sorter;
use App\Support\Text\Html;
use App\Support\Text\Slug;
use PHPUnit\Framework\TestCase;

/** The JavaScript semantics the API ports from the mock server, pinned. */
class PortedSemanticsTest extends TestCase
{
    public function test_slugs_transliterate_and_stay_within_75_characters(): void
    {
        $this->assertSame('whitefield-uphase', Slug::make('Whitefield Úphase'));
        $this->assertSame('strasse-und-cafe', Slug::make('Straße und Café'));
        $this->assertSame('', Slug::make('北京 !!'));
        $this->assertSame('buyer-assistance/home-loan', Slug::makePath('Buyer Assistance/Home Loan/'));
        $this->assertLessThanOrEqual(75, strlen(Slug::make(str_repeat('word ', 40))));
        $this->assertSame('a-2', Slug::unique([['id' => 1, 'slug' => 'a']], 'a'));
    }

    public function test_html_reads_as_its_text(): void
    {
        $this->assertSame('One two. Three & four', Html::strip('<p>One two.</p><p>Three &amp; four</p><script>x()</script>'));
        $this->assertSame(4, Html::wordCount('<p>One two.</p><p>Three four</p>'));
        $this->assertSame(1, Html::readingTime(0));
        $this->assertTrue(Html::unsafe('<a href="&#106;avascript:alert(1)">x</a>'));
        $this->assertFalse(Html::unsafe('<p>onward= is prose</p>'));
    }

    public function test_values_print_and_compare_as_javascript_does(): void
    {
        $this->assertSame('12400000', Js::string(12400000.0));
        $this->assertSame('8.5', Js::string(8.5));
        $this->assertSame(2, Js::length('😀'));
        $this->assertTrue(Js::isInteger(5.0));
        $this->assertSame(1, Js::parseInt('1e3'));
        $this->assertSame(16, Js::toNumber(' 0x10 '));
        $this->assertSame(3, Js::toNumber('0b11'));
        $this->assertNull(Js::toNumber('-0x10'));
        $this->assertLessThan(0, Sorter::compare('item 2', 'item 10'));
        $this->assertLessThan(0, Sorter::compare(true, false));
        $this->assertSame(['b', null], array_column(Sorter::sort([['v' => null], ['v' => 'b']], 'v', 'desc'), 'v'));
    }

    public function test_admin_paths_resolve_to_permissions(): void
    {
        $this->assertSame(['area' => 'properties', 'action' => 'edit'], RoutePermissions::resolve('/properties/1', 'PUT'));
        $this->assertSame(['area' => 'leads', 'action' => 'edit'], RoutePermissions::resolve('/leads/7/notes', 'POST'));
        $this->assertSame(['area' => 'users', 'action' => 'list'], RoutePermissions::resolve('/users', 'GET'));
        $this->assertSame(['area' => 'masterData', 'action' => 'create'], RoutePermissions::resolve('/property-types/check-slug', 'GET'));
        $this->assertNull(RoutePermissions::resolve('/unknown', 'GET'));
    }
}
