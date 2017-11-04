import fs from 'fs'
import LambdaChromeLauncher from './launcher'
import { debug } from './utils'
import DEFAULT_CHROME_FLAGS from './flags'
import http from 'http'

const DEVTOOLS_PORT = 9222
const DEVTOOLS_HOST = 'http://127.0.0.1'
const RANDOM_PORT = true;


function getPort() {
    return new Promise((resolve, reject) => {
        const server = http.createServer();
        server.listen(0);
        server.once('listening', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.once('error', reject);
    });
}


// persist the instance across invocations
// when the *lambda* container is reused.
let chromeInstance

export default async function launch (
  { flags = [], chromePath, port = DEVTOOLS_PORT, forceLambdaLauncher = false } = {}
) {
  const chromeFlags = [...DEFAULT_CHROME_FLAGS, ...flags]

  if (!chromeInstance) {

    // redefines DEVTOOLS_PORT with random one.
    if (RANDOM_PORT) {
      console.log('Random port: ON');
      port = await getPort();
      console.log('Random port: ', port);
    }

    if (process.env.AWS_EXECUTION_ENV || forceLambdaLauncher) {
      chromeInstance = new LambdaChromeLauncher({
        chromePath,
        chromeFlags,
        port,
      })
    } else {
      // This let's us use chrome-launcher in local development,
      // but omit it from the lambda function's zip artefact
      try {
        // eslint-disable-next-line global-require
        const { Launcher: LocalChromeLauncher } = require('chrome-launcher')
        chromeInstance = new LocalChromeLauncher({ chromePath, chromeFlags, port })
      } catch (error) {
        throw new Error(
          '@serverless-chrome/lambda: Unable to find "chrome-launcher". ' +
            "Make sure it's installed if you wish to develop locally."
        )
      }
    }
  }

  debug('Spawning headless shell')

  const launchStartTime = Date.now()

  try {
    await chromeInstance.launch()
  } catch (error) {
    debug('Error trying to spawn chrome:', error)

    if (process.env.DEBUG) {
      debug('stdout log:', fs.readFileSync(`${chromeInstance.userDataDir}/chrome-out.log`, 'utf8'))
      debug('stderr log:', fs.readFileSync(`${chromeInstance.userDataDir}/chrome-err.log`, 'utf8'))
    }

    throw new Error(
      'Unable to start Chrome. If you have the DEBUG env variable set,' +
        'there will be more in the logs.'
    )
  }

  const launchTime = Date.now() - launchStartTime

  debug(`It took ${launchTime}ms to spawn chrome.`)

  // unref the chrome instance, otherwise the lambda process won't end correctly
  if (chromeInstance.chrome) {
    chromeInstance.chrome.removeAllListeners()
    chromeInstance.chrome.unref()
  }

  return {
    pid: chromeInstance.pid,
    port: chromeInstance.port,
    url: `${DEVTOOLS_HOST}:${chromeInstance.port}`,
    kill: () => {
      chromeInstance.kill()
      chromeInstance = undefined
    },
    log: `${chromeInstance.userDataDir}/chrome-out.log`,
    errorLog: `${chromeInstance.userDataDir}/chrome-err.log`,
    pidFile: `${chromeInstance.userDataDir}/chrome.pid`,
    metaData: {
      launchTime,
      didLaunch: !!chromeInstance.pid,
    },
  }
}
