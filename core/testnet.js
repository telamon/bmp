import Hyperswarm from 'hyperswarm'
import { boot, A, L, R, U, D } from './index.js'
import crypto from 'node:crypto'

globalThis.crypto ||= crypto

async function spawnBot (name = 'robot') {
  const k = await boot(Hyperswarm)
  await k.spawn(name)
  while (true) {
    const p = await k.nextTurn()
    if (p.dead) break
    const moves = []
    for (let i = 0; i < p.speed; i++) {
      moves.push([L, R, U, D][Math.floor(Math.random() * 4)])
    }
    moves.splice(Math.floor(Math.random() * moves.length), -1, A)
    console.info(name, 'moves:', moves)
    await k.commitMoves(moves)
    await sleep(3000 + Math.random() * 6000)
  }
}

async function main () {
  const N = 15
  const bots = []
  for (let i = 0; i < N; i++) bots.push(spawnBot(`ROB${i}`))
  return await Promise.all(bots)
}

main()

async function sleep (n) {
  return new Promise(resolve => setTimeout(resolve, n))
}
