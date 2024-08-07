import { Memory, SimpleKernel } from 'picostack'
import { Modem56 } from 'picostack/modem56.js'
import { MemoryLevel } from 'memory-level'
export const WORLD_SIZE = 16
const MEM_PLAYERS = 'p'
const MOVES = Array.from(new Array(5)).map((_, n) => n)
export const [L, R, U, D, A] = MOVES

export class Kernel extends SimpleKernel {
  #m56 = null

  constructor (db) {
    super(db)
    this.store.repo.allowDetached = true // TODO:picostore: this obscure line will be default in final release
    this.store.register(MEM_PLAYERS, PlayerMemory)
  }

  async beginSwarm (swarm) {
    const topic = 'pbomb:v0/global'
    this.#m56 = new Modem56(swarm)
    this.leaveSwarm = await this.#m56.join(topic, this.spawnWire.bind(this), true)
  }
}

class PlayerMemory extends Memory {
  initialValue = {
    name: 'Anonymous',
    dead: false, // Killed by CHAIN&|AUTHOR
    bombs: 1,
    flame: 3,
    speed: 4,
    x: -1,
    y: -1
  }

  idOf ({ CHAIN }) { return CHAIN } // TODO:picostore: make CHAIN default.

  /** @type {import('@telamon/picostore').ComputeFunction} */
  async compute (value, ctx) {
    const { payload, reject, lookup, AUTHOR, block, index } = ctx

    const { type } = payload
    switch (type) {
      case 'spawn': {
        if (!block.genesis) return reject('Genesis Expected')
        const a = await lookup(AUTHOR)
        if (a) return reject('AUTHOR already exists')
        const { name } = payload
        if (typeof name !== 'string' && name.length && name.length < 16) return reject('Invalid Name')
        index(AUTHOR)

        let x = block.sig[1] % WORLD_SIZE
        const y = block.sig[2] % WORLD_SIZE
        if (isWall(x, y)) x = (x + 1) % WORLD_SIZE

        return {...value, name, x, y }
      }
    }
  }

  async spawn (branch, name, secret) {
    this.createBlock(branch, { type: 'spawn', name }, secret)
  }
}

export async function boot (swarm, cb) {
  console.log('boot() called, allocating memory')
  const DB = new MemoryLevel('picobomber.lvl', {
    valueEncoding: 'buffer',
    keyEncoding: 'buffer'
  })
  const kernel = new Kernel(DB)
  await kernel.boot()
  globalThis.K = kernel
  if (swarm) await kernel.beginSwarm(swarm)
  if (typeof cb === 'function') cb(kernel)
  return kernel
}

// simple gridlike level design
export function isWall(x, y) { return x % 2 && y % 2 }
