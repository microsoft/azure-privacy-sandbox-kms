param registry string
param location string
param ccePolicies object
param managedIDGroup string = resourceGroup().name
param managedIDName string

var kmsDnsName = deployment().name
var kmsUrl = '${kmsDnsName}.${location}.azurecontainer.io'
var kmsPublicIp = '$(dig +short ${kmsUrl})'
var kmsPrivateIp = '$(hostname -I | tr -d "[:space:]")'

var ccfSandboxPort = {
  protocol: 'TCP'
  port: 8000
}
var memberGetterPort = {
  protocol: 'TCP'
  port: 8001
}

resource containerGroup 'Microsoft.ContainerInstance/containerGroups@2023-05-01' = {
  name: deployment().name
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${resourceId(managedIDGroup, 'Microsoft.ManagedIdentity/userAssignedIdentities', managedIDName)}': {}
    }
  }
  properties: {
    osType: 'Linux'
    sku: 'Confidential'
    restartPolicy: 'Never'
    imageRegistryCredentials: [
      {
        server: registry
        identity: resourceId(managedIDGroup, 'Microsoft.ManagedIdentity/userAssignedIdentities', managedIDName)
      }
    ]
    ipAddress: {
      ports: [
        ccfSandboxPort
        memberGetterPort
      ]
      type: 'Public'
      dnsNameLabel: kmsDnsName
    }
    confidentialComputeProperties: {
      ccePolicy: ccePolicies.ccf_sandbox
    }
    volumes: [
      {
        name: 'workspace'
        emptyDir: {}  // Defines a shared empty directory
      }
    ]
    containers: [
      {
        name: 'ccfsandbox'
        properties: {
          image: '${registry}/ccf_sandbox/snp:latest'
          command: [
            '/bin/bash', '-c'
            join([
              'echo "UVM_SECURITY_CONTEXT_DIR=$UVM_SECURITY_CONTEXT_DIR" > /aci_env &&'
              '/opt/ccf_snp/bin/sandbox.sh'
              '--http2'
              '--snp-endorsements-servers THIM:$Fabric_NodeIPOrFQDN:2377'
              '-n "local://${kmsPrivateIp}:8000,${kmsPublicIp}:8000"'
              '--subject-alt-names iPAddress:${kmsPrivateIp}'
              '--subject-alt-names iPAddress:${kmsPublicIp}'
            ], ' ')
          ]
          ports: [ccfSandboxPort]
          resources: {
            requests: {
              memoryInGB: 4
              cpu: 1
            }
          }
          volumeMounts: [
            {
              name: 'workspace'
              mountPath: '/workspace'
            }
          ]
          readinessProbe: {
            httpGet: {
              path: '/node/network'
              port: 8000
            }
            initialDelaySeconds: 20
            periodSeconds: 1
            timeoutSeconds: 120
          }
        }
      }
      { // This is insecure if used in production, this is just for testing
        name: 'membergetter'
        properties: {
          image: 'mcr.microsoft.com/mirror/docker/library/python:3.9-slim'
          command: [
            'python', '-m', 'http.server', '8001', '--directory', '/workspace'
          ]
          ports: [memberGetterPort]
          resources: {
            requests: {
              memoryInGB: 2
              cpu: 1
            }
          }
          volumeMounts: [
            {
              name: 'workspace'
              mountPath: '/workspace'
            }
          ]
        }
      }
    ]
  }
}

output ids array = [containerGroup.id]
