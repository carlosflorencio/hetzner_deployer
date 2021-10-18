import {Client} from 'ssh2'

export class ServerConnection {
  constructor(host, port, username, key) {
    this.host = host
    this.port = port
    this.username = username
    this.key = key
  }
}

export const runCommands = (sshConnection, commands) => {
  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on('ready', async () => {
      let outputs = []

      try {
        for (let cmd of commands) {
          outputs.push((await executeCommand(conn, cmd)).trim())
        }

        conn.end()
        return resolve(outputs)
      } catch (e) {
        conn.end()
        return reject(e)
      }
    })

    conn.connect({
      host: sshConnection.host,
      port: parseInt(sshConnection.port),
      username: sshConnection.username,
      privateKey: sshConnection.key
    })
  })
}

function executeCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    let output = ''
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)

      stream.on('data', (data) => {
        output += data
      }).stderr.on('data', (data) => {
        output += data
      })

      stream.on('close', (code, signal) => {
        if(code === 0) {
          return resolve(output.toString())
        } else {
          return reject(output.toString())
        }
      })
    })
  })
}
