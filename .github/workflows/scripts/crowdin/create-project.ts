import crowdinImport from '@crowdin/crowdin-api-client';

// TODO Remove this type assertion when https://github.com/crowdin/crowdin-api-client-js/issues/508 is fixed
// @ts-expect-error
const crowdin = crowdinImport.default as typeof crowdinImport;
const SOURCE_LANGUAGE_ID = 'en';
const WORKFLOW_TEMPLATE_ID = 5; // hardcoded ID for the "i18n plugins" workflow template
const GRAFANA_CORE_PROJECT_ID = 5; // hardcoded project ID for Grafana Core

const API_TOKEN = process.env.CROWDIN_PERSONAL_TOKEN;
if (!API_TOKEN) {
  console.error('Error: CROWDIN_PERSONAL_TOKEN environment variable is not set');
  process.exit(1);
}

const PROJECT_NAME = process.env.PROJECT_NAME;
if (!PROJECT_NAME) {
  console.error('Error: PROJECT_NAME environment variable is not set');
  process.exit(1);
}

const credentials = {
  token: API_TOKEN,
  organization: 'grafana'
};

const { projectsGroupsApi } = new crowdin(credentials);

const languageIds = await getLanguagesFromExistingProject(GRAFANA_CORE_PROJECT_ID);
await createProject(PROJECT_NAME, languageIds);

async function getLanguagesFromExistingProject(projectId: number) {
  try {
    const project = await projectsGroupsApi.getProject(projectId);
    const languages = project.data.targetLanguageIds;
    console.log(`Fetched languages from project ${project.data.name} successfully!`);
    return languages;
  } catch (error) {
    console.error('Failed to fetch languages: ', error.message);
    if (error.response && error.response.data) {
      console.error('Error details: ', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

async function createProject(projectName: string, languageIds: string[]) {
  try {
    const response = await projectsGroupsApi.addProject({
      name: projectName,
      sourceLanguageId: SOURCE_LANGUAGE_ID,
      targetLanguageIds: languageIds,
      languageMapping: {
        // @ts-expect-error
        'zh-CN': {
          locale: 'zh-Hans',
        },
        // @ts-expect-error
        'zh-TW': {
          locale: 'zh-Hant',
        },
      },
      templateId: WORKFLOW_TEMPLATE_ID,
      skipUntranslatedStrings: true,
      notificationSettings: {
        translatorNewStrings: true,
        managerLanguageCompleted: true,
        managerNewStrings: true
      },
      // @ts-expect-error
      qaCheckCategories: {
        android: false,
      }
    });
    console.log(`Created project ${response.data.name} successfully with project id: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error('Failed to create project: ', error.message);
    if (error.response && error.response.data) {
      console.error('Error details: ', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}
