# Hetzner Deployer

Github Action for rolling deployments using Hetzner Loadbalancers. 

For a list of provided servers (VMs):
- Removes the server target from the loadbalancer (via Hetzner API)
  - Possibility to wait a specified time to handle the inflight requests
- Run commands on the server (via SSH)
  - Deploy your new application version
- Inserts back the server into the loadbalancer
- Proceeds to the next server

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
            docker rm -f app || true
            docker run -d --restart always \
              --name app \
              -p 80:80 \
              ${{ needs.build.outputs.image }}
```
