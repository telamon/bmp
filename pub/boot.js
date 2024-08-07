import Hyperswarm from 'hyperswarm'
import { main } from './ui.build.js'
main(Hyperswarm)
  .catch(err => console.error('boot failed', err))
  .then(() => console.info('boot success'))
