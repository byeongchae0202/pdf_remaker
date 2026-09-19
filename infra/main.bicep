param location string = resourceGroup().location
param appName string = 'pdf-remaker'
param staticSiteSku string = 'Free'

var suffix = uniqueString(resourceGroup().id)
var storageName = toLower(replace('${appName}${suffix}', '-', ''))
var staticSiteName = '${appName}-web-${suffix}'

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

resource staticSite 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticSiteName
  location: location
  sku: { name: staticSiteSku }
  properties: { stagingEnvironmentPolicy: 'Enabled' }
}

output staticSiteName string = staticSite.name
output storageAccountName string = storage.name
