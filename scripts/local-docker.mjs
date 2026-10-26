import { spawnSync } from 'node:child_process'

// Never let a user's remote Docker context turn a local validation command into deployment.
export function localDockerEnv() {
  let endpoint
  if(process.env.DOCKER_HOST&&!process.env.DOCKER_CONTEXT)endpoint=process.env.DOCKER_HOST
  else {
    const context=spawnSync('docker',['context','inspect','--format','{{json .Endpoints.docker.Host}}'],{encoding:'utf8',timeout:10000})
    if(context.status!==0)throw new Error('Cannot inspect the local Docker context')
    endpoint=JSON.parse(context.stdout.trim())
  }
  if(typeof endpoint!=='string'||!(/^(unix:\/\/\/|npipe:\/\/\/\/\.\/pipe\/)/.test(endpoint)))throw new Error('Validation requires a local Docker socket. No containers were started.')
  return {...process.env,DOCKER_CONTEXT:'',DOCKER_HOST:endpoint}
}
