const LOGGING_FLAGS = process.env.DEBUG ? ['--enable-logging', '--log-level=0', '--v=99'] : []

export default [
  ...LOGGING_FLAGS,
  '--disable-gpu',
  '--single-process', // Currently wont work without this :-(

  // https://groups.google.com/a/chromium.org/d/msg/headless-dev/qqbZVZ2IwEw/Y95wJUh2AAAJ
  '--no-zygote', // helps avoid zombies

  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-sync',
  '--disable-translate',
  '--headless',
  '--mute-audio',
  '--window-size=1920,1080',
  '--metrics-recording-only',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',

  '--no-sandbox',
]
