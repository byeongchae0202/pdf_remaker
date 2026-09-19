param location string = resourceGroup().location
param appName string = 'pdf-remaker'
param staticSiteSku string = 'Free'
param openAiDeploymentName string = 'summary-model'
param openAiModelName string = 'gpt-4o-mini'
param openAiModelVersion string = '2024-07-18'

var suffix = uniqueString(resourceGroup().id)
var storageName = toLower(replace('${appName}${suffix}', '-', ''))
var functionName = '${appName}-api-${suffix}'
var staticSiteName = '${appName}-web-${suffix}'
var documentIntelligenceName = '${appName}-doc-${suffix}'
var openAiName = '${appName}-ai-${suffix}'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  name: 'default'
  parent: storage
}

resource tempContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: 'temp'
  parent: blobService
  properties: { publicAccess: 'None' }
}

resource lifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  name: 'default'
  parent: storage
  properties: {
    policy: {
      rules: [
        {
          name: 'delete-temporary-pdf-data'
          type: 'Lifecycle'
          enabled: true
          definition: {
            filters: { blobTypes: [ 'blockBlob' ], prefixMatch: [ 'temp/' ] }
            actions: { baseBlob: { delete: { daysAfterModificationGreaterThan: 1 } } }
          }
        }
      ]
    }
  }
}

resource documentIntelligence 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: documentIntelligenceName
  location: location
  kind: 'FormRecognizer'
  sku: { name: 'S0' }
  properties: { customSubDomainName: documentIntelligenceName, publicNetworkAccess: 'Enabled' }
}

resource openAi 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: openAiName
  location: location
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: { customSubDomainName: openAiName, publicNetworkAccess: 'Enabled' }
}

resource openAiDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  name: openAiDeploymentName
  parent: openAi
  sku: { name: 'Standard', capacity: 1 }
  properties: {
    model: { format: 'OpenAI', name: openAiModelName, version: openAiModelVersion }
  }
}

resource functionPlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${functionName}-plan'
  location: location
  kind: 'functionapp'
  sku: { name: 'Y1', tier: 'Dynamic' }
  properties: { reserved: true }
}

resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: functionName
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Node|20'
      appSettings: [
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}' }
        { name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', value: documentIntelligence.properties.endpoint }
        { name: 'AZURE_OPENAI_ENDPOINT', value: openAi.properties.endpoint }
        { name: 'AZURE_OPENAI_DEPLOYMENT', value: openAiDeploymentName }
      ]
    }
  }
}

resource staticSite 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticSiteName
  location: location
  sku: { name: staticSiteSku }
  properties: { stagingEnvironmentPolicy: 'Enabled' }
}

resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2022-09-01' = {
  name: 'default'
  parent: staticSite
  properties: { backendResourceId: functionApp.id, region: location }
}

output staticSiteName string = staticSite.name
output functionAppName string = functionApp.name
output storageAccountName string = storage.name
output documentIntelligenceEndpoint string = documentIntelligence.properties.endpoint
output openAiEndpoint string = openAi.properties.endpoint