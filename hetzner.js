const axios = require("axios")

class Hetzner {
  constructor(token) {
    this.axios = axios.create({
      baseURL: 'https://api.hetzner.cloud/v1',
      timeout: 50000,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
  }

  getServers() {
    return this.axios.get('/servers').then(r => r.data)
  }

  getLoadbalancers() {
    return this.axios.get('/load_balancers').then(r => r.data)
  }

  getLoadbalancer(id) {
    return this.axios.get(`/load_balancers/${id}`).then(r => r.data)
  }

  addTargetToLoadbalancer(loadbalancer_id, server_id) {
    return this.axios.post(`/load_balancers/${loadbalancer_id}/actions/add_target`, {
      "server": {
        "id": server_id
      },
      "type": "server",
      "use_private_ip": true
    }).then(r => r.data)
  }

  removeLoadbalancerTarget(loadbalancer_id, server_id) {
    return this.axios.post(`/load_balancers/${loadbalancer_id}/actions/remove_target`, {
      "server": {
        "id": server_id
      },
      "type": "server",
      "use_private_ip": true
    }).then(r => r.data)
  }
}

const findServer = (hetznerServerResponse, ip) => {
  return hetznerServerResponse.servers.find(s => s.public_net.ipv4.ip === ip)
}

const findLoadbalancersWithServer = (hetznerLoadbalancersResponse, serverId) => {
  const lbs = []

  for (const lb of hetznerLoadbalancersResponse.load_balancers) {
    if(lb.targets.filter(t => t.type === "server").find(t => t.server.id === serverId)) {
      lbs.push(lb)
    }
  }

  return lbs
}

module.exports = {
  Hetzner,
  findServer,
  findLoadbalancersWithServer
}
