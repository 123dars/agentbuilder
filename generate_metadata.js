const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const tables = [
    {
        name: 'organizations',
        columns: ['id', 'name', 'quota_limit', 'quota_used', 'created_at', 'updated_at'],
        array_rels: [
            { name: 'members', using: { foreign_key_constraint_on: { column: 'org_id', table: { name: 'org_members', schema: 'public' } } } },
            { name: 'workflows', using: { foreign_key_constraint_on: { column: 'org_id', table: { name: 'workflows', schema: 'public' } } } }
        ]
    },
    {
        name: 'org_members',
        columns: ['id', 'org_id', 'user_id', 'role', 'created_at'],
        obj_rels: [
            { name: 'organization', using: { foreign_key_constraint_on: 'org_id' } }
        ]
    },
    {
        name: 'workflows',
        columns: ['id', 'org_id', 'name', 'description', 'created_at', 'updated_at'],
        obj_rels: [
            { name: 'organization', using: { foreign_key_constraint_on: 'org_id' } }
        ],
        array_rels: [
            { name: 'steps', using: { foreign_key_constraint_on: { column: 'workflow_id', table: { name: 'workflow_steps', schema: 'public' } } } },
            { name: 'triggers', using: { foreign_key_constraint_on: { column: 'workflow_id', table: { name: 'workflow_triggers', schema: 'public' } } } },
            { name: 'runs', using: { foreign_key_constraint_on: { column: 'workflow_id', table: { name: 'workflow_runs', schema: 'public' } } } }
        ]
    },
    {
        name: 'workflow_steps',
        columns: ['id', 'workflow_id', 'step_order', 'type', 'config', 'created_at'],
        obj_rels: [
            { name: 'workflow', using: { foreign_key_constraint_on: 'workflow_id' } }
        ]
    },
    {
        name: 'workflow_triggers',
        columns: ['id', 'workflow_id', 'type', 'config', 'created_at'],
        obj_rels: [
            { name: 'workflow', using: { foreign_key_constraint_on: 'workflow_id' } }
        ]
    },
    {
        name: 'workflow_runs',
        columns: ['id', 'workflow_id', 'status', 'started_at', 'completed_at'],
        obj_rels: [
            { name: 'workflow', using: { foreign_key_constraint_on: 'workflow_id' } }
        ],
        array_rels: [
            { name: 'step_runs', using: { foreign_key_constraint_on: { column: 'run_id', table: { name: 'step_runs', schema: 'public' } } } }
        ]
    },
    {
        name: 'step_runs',
        columns: ['id', 'run_id', 'step_id', 'status', 'input', 'output', 'error', 'attempt_count', 'approved_by', 'approved_at', 'started_at', 'completed_at'],
        obj_rels: [
            { name: 'run', using: { foreign_key_constraint_on: 'run_id' } },
            { name: 'step', using: { foreign_key_constraint_on: 'step_id' } }
        ]
    },
    {
        name: 'org_usage_stats',
        columns: ['org_id', 'name', 'quota_limit', 'quota_used', 'total_workflows', 'total_runs'],
        is_view: true,
        obj_rels: [
            { name: 'organization', using: { manual_configuration: { remote_table: { name: 'organizations', schema: 'public' }, column_mapping: { org_id: 'id' } } } }
        ]
    }
];

const getRolePerms = (table) => {
    let selectFilter = {};
    if (table.name === 'organizations') {
        selectFilter = { members: { user_id: { _eq: "X-Hasura-User-Id" } } };
    } else if (table.name === 'org_members') {
        selectFilter = { organization: { members: { user_id: { _eq: "X-Hasura-User-Id" } } } };
    } else if (table.name === 'org_usage_stats') {
        selectFilter = { organization: { members: { user_id: { _eq: "X-Hasura-User-Id" } } } };
    } else if (table.name === 'workflows') {
        selectFilter = { organization: { members: { user_id: { _eq: "X-Hasura-User-Id" } } } };
    } else if (['workflow_steps', 'workflow_triggers', 'workflow_runs'].includes(table.name)) {
        selectFilter = { workflow: { organization: { members: { user_id: { _eq: "X-Hasura-User-Id" } } } } };
    } else if (table.name === 'step_runs') {
        selectFilter = { run: { workflow: { organization: { members: { user_id: { _eq: "X-Hasura-User-Id" } } } } } };
    }

    let insertCheck = null;
    let updateCheck = null;
    let deleteCheck = null;

    if (table.name === 'workflows') {
        insertCheck = { organization: { members: { _and: [{ user_id: { _eq: "X-Hasura-User-Id" } }, { role: { _in: ["owner", "editor"] } }] } } };
        updateCheck = insertCheck;
        deleteCheck = insertCheck;
    } else if (['workflow_steps', 'workflow_triggers'].includes(table.name)) {
        insertCheck = { workflow: { organization: { members: { _and: [{ user_id: { _eq: "X-Hasura-User-Id" } }, { role: { _in: ["owner", "editor"] } }] } } } };
        updateCheck = insertCheck;
        deleteCheck = insertCheck;
    }

    const perms = {};
    
    if (Object.keys(selectFilter).length > 0) {
        perms.select_permissions = [
            {
                role: 'user',
                permission: {
                    columns: '*',
                    filter: selectFilter
                }
            }
        ];
    }

    if (insertCheck) {
        perms.insert_permissions = [
            {
                role: 'user',
                permission: {
                    check: insertCheck,
                    columns: '*',
                    set: {}
                }
            }
        ];
        perms.update_permissions = [
            {
                role: 'user',
                permission: {
                    check: updateCheck,
                    filter: updateCheck,
                    columns: '*'
                }
            }
        ];
        perms.delete_permissions = [
            {
                role: 'user',
                permission: {
                    filter: deleteCheck
                }
            }
        ];
    }
    return perms;
};

const outputDir = path.join(__dirname, 'nhost', 'metadata', 'databases', 'default', 'tables');
fs.mkdirSync(outputDir, { recursive: true });

let tablesYamlFiles = [];

tables.forEach(table => {
    let tableMeta = {
        table: {
            name: table.name,
            schema: 'public'
        }
    };

    if (table.obj_rels) {
        tableMeta.object_relationships = table.obj_rels;
    }
    
    if (table.array_rels) {
        tableMeta.array_relationships = table.array_rels;
    }

    Object.assign(tableMeta, getRolePerms(table));

    const yamlStr = yaml.dump(tableMeta, { noRefs: true });
    fs.writeFileSync(path.join(outputDir, `public_${table.name}.yaml`), yamlStr);
    tablesYamlFiles.push(`- "!include public_${table.name}.yaml"`);
});

fs.writeFileSync(path.join(outputDir, 'tables.yaml'), tablesYamlFiles.join('\n') + '\n');

// Also create Actions metadata
const actionsDir = path.join(__dirname, 'nhost', 'metadata');
fs.mkdirSync(actionsDir, { recursive: true });

const actionsYaml = yaml.dump({
    actions: [
        {
            name: 'triggerWorkflowRun',
            definition: {
                handler: '{{NHOST_BACKEND_URL}}/v1/functions/actions/triggerWorkflowRun',
                output_type: 'TriggerWorkflowRunOutput',
                arguments: [
                    { name: 'workflow_id', type: 'uuid!' }
                ],
                type: 'mutation',
                kind: 'synchronous'
            },
            permissions: [{ role: 'user' }]
        },
        {
            name: 'approveStep',
            definition: {
                handler: '{{NHOST_BACKEND_URL}}/v1/functions/actions/approveStep',
                output_type: 'ApproveStepOutput',
                arguments: [
                    { name: 'step_run_id', type: 'uuid!' },
                    { name: 'approved', type: 'Boolean!' }
                ],
                type: 'mutation',
                kind: 'synchronous'
            },
            permissions: [{ role: 'user' }]
        }
    ],
    custom_types: {
        objects: [
            { name: 'TriggerWorkflowRunOutput', fields: [{ name: 'run_id', type: 'uuid!' }, { name: 'status', type: 'String!' }] },
            { name: 'ApproveStepOutput', fields: [{ name: 'success', type: 'Boolean!' }] }
        ]
    }
}, { noRefs: true });

fs.writeFileSync(path.join(actionsDir, 'actions.yaml'), actionsYaml);
console.log('Hasura Metadata generated successfully!');
