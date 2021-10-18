import core from '@actions/core'
import {runCommands, ServerConnection} from "./ssh.js"
import {findLoadbalancersWithServer, findServer, Hetzner} from "./hetzner.js"

const options = {
  SSH_KEY: core.getInput('ssh_key', { required: true }),
  SSH_PORT: core.getInput('ssh_port') || "22",
  SSH_USER: core.getInput('ssh_port') || "root",
  HETZNER_API_TOKEN: core.getInput('hetzner_token', { required: true }),
  COMMANDS: core.getMultilineInput('commands', { required: true }),
  GRACEFUL_WAIT: core.getInput('graceful_wait_seconds') || 30,
  SERVERS: core.getInput('servers', { required: true }).split(',').map(s => s.trim())
}

const hetzner = new Hetzner(options.HETZNER_API_TOKEN)

async function run() {
  const hetznerServers = await hetzner.getServers()
  const hetznerLoadbalancers = await hetzner.getLoadbalancers()

  for (let ip of options.SERVERS) {
    const sshConnection = new ServerConnection(ip, options.SSH_PORT, options.SSH_USER, options.SSH_KEY)
    const server = findServer(hetznerServers, ip)
    const lbsWithThisServer = findLoadbalancersWithServer(hetznerLoadbalancers, server.id)

    for (let lb of lbsWithThisServer) {
      core.info(`Removing ${server.name}(${ip}) from loadbalancer (${lb.name})`)
      const removed = await hetzner.removeLoadbalancerTarget(lb.id, server.id)

      if(removed.action.status !== "success") {
        throw new Error("Failed to remove the target server from the loadbalancer")
      }

      core.info(`Waiting ${options.GRACEFUL_WAIT} seconds for the server to finish inflight requests`)

      // Wait a few seconds so the server can finish the inflight requests
      await sleep(parseInt(options.GRACEFUL_WAIT) * 1000)

      core.info(`Running deploy commands`)
      const deployOutput = await runCommands(sshConnection, options.COMMANDS)

      core.startGroup('Commands output')
      deployOutput.forEach(o => core.info)
      core.endGroup()

      core.info(`Inserting ${server.name}(${ip}) into loadbalancer (${lb.name})`)
      const inserted = await hetzner.addTargetToLoadbalancer(lb.id, server.id)

      if(inserted.action.status !== "success") {
        throw new Error("Failed to insert the target server in the loadbalancer")
      }

      core.info(`Waiting for the loadbalancer healthcheck to be healthy`)
      // wait for the server to become healthy again
      // if it doesn't, this will throw an exception and the deploy will stop
      await waitUntilServerIsHealthy(lb.id, server.id)

      core.notice(`${server.name}(${ip}) deployed with success`)
    }
  }
}

async function waitUntilServerIsHealthy(loadbalancerId, serverId) {
  let tries = 60
  do {
    const lbResponse = await hetzner.getLoadbalancer(loadbalancerId)

    for (const target of lbResponse.load_balancer.targets) {

      if(target.type === "server" && target.server.id === serverId) {
        // one single port healthy is enough
        if(target.health_status.find(h => h.status === "healthy")) {
          return "done"
        }
      }

    }

    core.info(`Not healthy on this try, ${tries} remaining`)

    await sleep(1000)
  } while (--tries > 0)

  throw new Error("Server did not become healthy")
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

try {
  core.info('Starting deploy')
  await run()
}
catch (err) {
  core.setFailed(`Action failed with error ${err}`);
}