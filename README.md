# Hetzner Deployer

Github Action for rolling deployments using Hetzner Loadbalancers. 

For a list of servers (VMs):
- Removes the server target from the loadbalancer (via Hetzner API)
  - Possibility to wait a specified time to handle the inflight requests
- Run commands on the server (via SSH)
  - Deploy your new application version
- Inserts back the server into the loadbalancer

# Usage example

```yml
name: Deploy
on: [push]
jobs:
    deploy:
        if: github.ref == 'refs/heads/main'
        needs: [build]
        runs-on: ubuntu-latest
        steps:
          - uses: carlosflorencio/hetzner_deployer@v1
            with:
              servers: 58.16.128.73, 28.45.100.18
                hetzner_token: ${{ secrets.HETZNER_TOKEN }}
              ssh_key: ${{ secrets.SSH_KEY }}
              ssh_port: 22
              graceful_wait_seconds: 5
              commands: |
                echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
                docker image prune -f
                docker pull ${{ needs.build.outputs.image }}
                docker stop app || true
                docker rm app || true
                docker run -d --restart always \
                  --name app \
                  -p 80:80 \
                  ${{ needs.build.outputs.image }}
                docker container inspect app -f '{{.State.Status}}' | grep -i running
```
