import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

import EntityPicker from '../../../../../components/admin/EntityPicker';
import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import MultiSelect from '../../../../../components/admin/MultiSelect';
import PATHS from '../../../../../routes/paths';
import { Alert, Button, DateField, NumberField, SwitchField } from '../../../../../components/ui';
import { CONSTRUCTION_STATUS, PROJECT_APPROVALS } from '../../../../../config/enums';
import { makeTimelineItem } from '../initialState';
import { useDeveloperSearch } from '../../../../../hooks/useMasterData';
import { useMasterData } from '../../../../../contexts/MasterDataContext';
import DeveloperQuickCreateDialog from '../components/DeveloperQuickCreateDialog';
import TimelineRepeater from '../components/TimelineRepeater';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/** The two statuses where construction is history rather than news. */
const COMPLETED_STATUSES = ['ready-to-move', 'resale'];

/**
 * Tab 11 — Project & builder.
 *
 * Who built it, how big it is, what it is approved under, and how far along it
 * is. The boilerplate kept the developer as free text with a logo URL and three
 * "stats" pasted onto every listing; a developer is master data now (§6.5), so
 * the property holds `project.developerId` and the profile — the logo, the
 * description, the completed-project count — is edited once and is right
 * everywhere.
 */
export default function ProjectBuilderTab() {
  const { values, errors, setField, addItem, removeItem, moveItem, updateItem, goToTab, disabled } =
    usePropertyFormContext();
  const { refresh } = useMasterData();
  const { developers, search, byId } = useDeveloperSearch({ activeOnly: false });

  const [creating, setCreating] = useState(false);

  const project = values.project ?? {};
  const timeline = values.constructionTimeline ?? [];
  const developer = byId(project.developerId);
  const completed = COMPLETED_STATUSES.includes(values.constructionStatus);
  const claimsRera = (project.approvals ?? []).includes('rera') && values.reraRegistered !== true;

  // The dialog refuses a name master data already holds, so the list it checks
  // against has to be the current one: `MasterDataContext` caches for ten
  // minutes (D93), and a developer created in another tab meanwhile would
  // otherwise be invisible to the check.
  useEffect(() => {
    if (creating) refresh('developers');
  }, [creating, refresh]);

  const patchProject = (field, value) => setField(`project.${field}`, value);

  const wholeNumber = (event) =>
    event.target.value === '' ? null : Math.trunc(Number(event.target.value));

  return (
    <>
      <FormSection
        title="Builder"
        description="The developer behind the project. Pick the master-data record so every listing of theirs shares one profile, one logo and one page."
      >
        <FormColumn>
          <EntityPicker
            label="Developer"
            fetcher={search}
            multiple={false}
            value={project.developerId ?? null}
            selectedRecords={developers}
            error={errors['project.developerId']}
            disabled={disabled}
            placeholder="Search developers…"
            hint="Leave it empty for a resale flat with no project behind it."
            onChange={(id) => patchProject('developerId', id)}
          />
        </FormColumn>

        <FormColumn>
          <div className={[styles.actions, styles.actionsEnd].join(' ')}>
            {developer ? (
              <Button
                variant="ghost"
                size="sm"
                href={PATHS.adminDeveloperEdit(developer.id)}
                target="_blank"
                rel="noreferrer"
                icon={<Icon icon="mdi:open-in-new" width="16" height="16" />}
              >
                Edit {developer.name} in master data
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setCreating(true)}
              icon={<Icon icon="mdi:plus" width="16" height="16" />}
            >
              Add new developer
            </Button>
          </div>
        </FormColumn>

        {developer ? (
          <FormColumn className={styles.conditional}>
            <div className={styles.summary}>
              <p className={styles.summaryText}>
                <span className={styles.summaryValue}>{developer.name}</span>
                {developer.establishedYear ? ` · since ${developer.establishedYear}` : ''}
                {developer.completedProjects
                  ? ` · ${developer.completedProjects} completed projects`
                  : ''}
                {developer.ongoingProjects ? ` · ${developer.ongoingProjects} ongoing` : ''}
                <br />
                The logo, the profile and the RERA ids come from that record.
              </p>
            </div>
          </FormColumn>
        ) : null}
      </FormSection>

      <FormSection
        title="Project"
        description="The figures a buyer compares projects by. Leave anything unknown empty rather than guessing — an empty field is simply not printed."
      >
        <FormColumn half>
          <NumberField
            label="Total units"
            min={0}
            value={project.totalUnits ?? ''}
            error={errors['project.totalUnits']}
            disabled={disabled}
            onChange={(event) => patchProject('totalUnits', wholeNumber(event))}
          />
        </FormColumn>
        <FormColumn half>
          <NumberField
            label="Towers"
            min={0}
            value={project.totalTowers ?? ''}
            error={errors['project.totalTowers']}
            disabled={disabled}
            onChange={(event) => patchProject('totalTowers', wholeNumber(event))}
          />
        </FormColumn>
        <FormColumn half>
          <NumberField
            label="Floors per tower"
            min={0}
            value={project.totalFloors ?? ''}
            error={errors['project.totalFloors']}
            disabled={disabled}
            hint="The project's height. The floor this unit is on is on Basics."
            onChange={(event) => patchProject('totalFloors', wholeNumber(event))}
          />
        </FormColumn>
        <FormColumn half>
          <NumberField
            label="Project area (acres)"
            min={0}
            step={0.01}
            value={project.projectAreaAcres ?? ''}
            error={errors['project.projectAreaAcres']}
            disabled={disabled}
            onChange={(event) =>
              patchProject(
                'projectAreaAcres',
                event.target.value === '' ? null : Number(event.target.value)
              )
            }
          />
        </FormColumn>
        <FormColumn half>
          <NumberField
            label="Open area (%)"
            min={0}
            max={100}
            value={project.openAreaPercent ?? ''}
            error={errors['project.openAreaPercent']}
            disabled={disabled}
            hint="How much of the site is not built on."
            onChange={(event) => patchProject('openAreaPercent', wholeNumber(event))}
          />
        </FormColumn>
        <FormColumn half>
          <DateField
            label="Launch date"
            value={project.launchDate ?? ''}
            error={errors['project.launchDate']}
            disabled={disabled}
            onChange={(event) => patchProject('launchDate', event.target.value)}
          />
        </FormColumn>

        <FormColumn>
          <MultiSelect
            label="Approvals"
            options={PROJECT_APPROVALS.options}
            value={project.approvals ?? []}
            error={errors['project.approvals']}
            disabled={disabled}
            hint="The authorities that have approved the plan."
            onChange={(next) => patchProject('approvals', next)}
          />
        </FormColumn>

        {claimsRera ? (
          <FormColumn className={styles.conditional}>
            <Alert tone="warning" title="RERA is listed as an approval">
              The listing does not carry a RERA registration number yet. Turn “RERA registered” on
              and give the number on Basics, or take RERA out of this list — a claim with nothing
              behind it is the one thing a buyer checks.{' '}
              <Button variant="link" size="sm" onClick={() => goToTab?.('basics')}>
                Open Basics
              </Button>
            </Alert>
          </FormColumn>
        ) : null}

        <FormColumn>
          <SwitchField
            label="Landmark project"
            checked={project.landmarkProject === true}
            disabled={disabled}
            hint="Marks it as one of the ones the area is known by."
            onChange={(checked) => patchProject('landmarkProject', checked)}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Construction timeline"
        description="What has been built, and what is next. Each milestone can carry a date, a note and a photograph from the site."
        className={completed ? styles.optional : undefined}
      >
        {completed ? (
          <FormColumn>
            <Alert tone="info" title="Optional for completed properties">
              This listing is marked “{CONSTRUCTION_STATUS.labelOf(values.constructionStatus)}”, so
              the construction section is usually left empty. It is kept here rather than hidden: a
              finished project with a handover date still has a story worth telling.
            </Alert>
          </FormColumn>
        ) : null}

        <FormColumn>
          <TimelineRepeater
            rows={timeline}
            errors={errors}
            progress={values.constructionProgressPercent}
            disabled={disabled}
            onProgressChange={(value) => setField('constructionProgressPercent', value)}
            onAdd={() => addItem('constructionTimeline', makeTimelineItem())}
            onUpdate={(id, patch) => updateItem('constructionTimeline', id, patch)}
            onRemove={(id) => removeItem('constructionTimeline', id)}
            onMove={(from, to) => moveItem('constructionTimeline', from, to)}
            onAddPresets={(milestones) =>
              milestones.forEach((milestone) =>
                addItem('constructionTimeline', makeTimelineItem({ milestone }))
              )
            }
          />
        </FormColumn>
      </FormSection>

      <DeveloperQuickCreateDialog
        open={creating}
        existing={developers}
        onClose={() => setCreating(false)}
        onCreated={async (record) => {
          setCreating(false);
          if (!record?.id) return;
          patchProject('developerId', record.id);
          await refresh('developers');
        }}
      />
    </>
  );
}
