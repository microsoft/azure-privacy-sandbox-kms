using './ccf_sandbox.bicep'

// Image info
param registry=''

// Deployment info
param location=''
param ccePolicies={
  ccf_sandbox: ''
}
param managedIDName=''
