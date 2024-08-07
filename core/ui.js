import { boot, WORLD_SIZE, isWall, Kernel, A, L, R, U, D } from './index.js'
import { settle } from 'piconuro'
import {
  Application,
  Graphics,
  BitmapText,
  Text,
  Container
} from 'pixi.js'

const TILE_SIZE = 64

/** @type {Application} */
let app = null

/** @type {Graphics} */
let world = null

/** @type {Kernel} */
let kernel = null

let SCENE = 'title'

/** @type {Container} */
let player = null

/** @type {Record<string, Container>} */
const players = {}

export async function main (Hyperswarm) {
  console.log('Booting up')
  kernel = await boot(Hyperswarm)
  app = new Application()
  await app.init({ width: window.innerWidth, height: window.innerHeight })
  document.body.appendChild(app.canvas)
  app.ticker.add(loop)
  world = new Container()
  const plane = new Graphics()
    .rect(0, 0, WORLD_SIZE * TILE_SIZE, WORLD_SIZE * TILE_SIZE)
    .fill('gray')
  plane.setStrokeStyle({ color: 'black', width: 3 })
  for (let i = 0; i < WORLD_SIZE; i++) {
    // Draw Horizontal grid
    plane.moveTo(i * TILE_SIZE, 0)
      .lineTo(i * TILE_SIZE, WORLD_SIZE * TILE_SIZE)
      .stroke()
    // Vertical
    plane.moveTo(0, i * TILE_SIZE)
      .lineTo(WORLD_SIZE * TILE_SIZE, i * TILE_SIZE)
      .stroke()
  }

  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      if (isWall(x, y)) {
        const m = 4
        plane.rect(m + x * TILE_SIZE, m + y * TILE_SIZE, TILE_SIZE - m * 2, TILE_SIZE - m * 2).fill('#333')
        // const r = TILE_SIZE / 2 - 8
        // world.circle(TILE_SIZE / 2 + x * TILE_SIZE, TILE_SIZE / 2 + y * TILE_SIZE, r).fill('purple')
      }
    }
  }
  world.addChild(plane)
  app.stage.addChild(world)
  app.stage.addChild(await renderTitleScreen())

  const unsub = settle(s => kernel.pmem.sub(s))(onPlayersUpdated)
}

function onPlayersUpdated (state) {
  let info = ''
  const processed = []
  for (const chain in state) {
    console.log(chain, kernel.pk)
    const data = state[chain]
    if (data.pk === kernel.pk) continue // Don't do player here.
    if (!(chain in players)) {
      const c = new Container()
      const s = new Text({ // Placeholder sprite
        text: '🏃‍♂️',
        style: { fontSize: TILE_SIZE }
      })
      c.addChild(s)
      const label = new Text({ text: data.name, style: { fontSize: 16 } })
      label.y = TILE_SIZE - label.height
      // label.x = TILE_SIZE - label.width / 2
      c.addChild(label)
      players[chain] = c
      world.addChild(c)
    }
    const player = players[chain]
    // Update position
    player.position.x = data.x * TILE_SIZE
    player.position.y = data.y * TILE_SIZE
    processed.push(chain)
    info += `${data.name}: ${data.x}, ${data.y} |`
  }
  console.log(info)

  // gc
  const gone = Object.keys(players).filter(k => !~processed.indexOf(k))
  for (const pk in gone) {
    world.removeChild(players[pk])
    delete players[pk]
  }
}

/** @returns {Promise<Container>} */
async function renderTitleScreen () {
  const container = new Container()
  container.label = 'scene:title'

  const title = new BitmapText({
    text: 'InfinityBomber\n💣',
    style: { fontSize: 72, align: 'center' }
  })
  container.addChild(title)
  title.x = app.canvas.width / 2 - title.width / 2
  title.y = 100

  const t2 = new Text({
    text: 'Input name and hit enter',
    style: {
      fontFamily: 'monospace',
      fontSize: 32,
      fill: 'white'
    }
  })
  container.addChild(t2)
  t2.x = app.canvas.width / 2 - t2.width / 2
  t2.y = app.canvas.height - t2.height - 50
  const el = document.createElement('input')
  el.type = 'text'
  el.placeholder = 'Name'
  el.style.position = 'absolute'
  el.style.padding = '10px 10px'
  document.body.appendChild(el)
  el.style.top = (app.canvas.height / 2) + 'px'
  el.style.left = (app.canvas.width / 2 - el.getBoundingClientRect().width / 2) + 'px'
  el.addEventListener('keyup', ev => {
    if (ev.key === 'Enter') {
      const name = el.value.trim() || `Anonymous${Math.floor(Math.random() * 255)}`
      kernel.spawn(name)
        .then(() => {
          app.stage.removeChild(container) // remove self
          document.body.removeChild(el)
          setupPlay()
        })
        .catch(console.error)
    }
  })
  return container
}

/** @param {KeyboardEvent} ev
  * @return {A|L|R|U|P|'Enter'} */
function keyToAction (ev) {
  switch (ev.key) {
    case 'ArrowLeft':
    case 'a':
      return L
    case 'ArrowRight':
    case 'd':
      return R
    case 'ArrowUp':
    case 'w':
      return U
    case 'ArrowDown':
    case 's':
      return D
    case ' ': // space/bomb
      return A
    case 'Enter': return 'Enter'
  }
}

function setupPlay () {
  SCENE = 'play'
  player = new Container()
  player.label = 'player'
  const s = new Text({ text: '🚶', style: { fontSize: TILE_SIZE } })
  player.addChild(s)
  world.addChild(player)

  let movesBuffer = []
  document.body.addEventListener('keydown', async ev => {
    const move = keyToAction(ev)
    if (!move) return

    if (move === 'Enter') {
      const m = movesBuffer
      movesBuffer = []
      await kernel.commitMoves(m)
      return
    }

    movesBuffer.push(move)
  })
}

let gTime = 0
/** @param {import('pixi.js').Ticker} ticker */
function loop (ticker) {
  const { deltaTime } = ticker
  gTime += deltaTime
  // console.log('processing', ticker.deltaTime)
  // const dim = (WORLD_SIZE * TILE_SIZE)
  // world.position.x = (world.position.x - deltaTime) % (TILE_SIZE * 2)
  // world.position.y = (world.position.y - deltaTime) % (TILE_SIZE * 2)
  // world.position.x = (1 + Math.sin(gTime * 0.01) / 2) * -50
  // world.position.y = (1 + Math.sin(gTime * 0.01) / 2) * dim
  // world.scale.x = world.scale.y = Math.min(1, Math.max(Math.cos(gTime * 0.01)), 0.3)
}

// document.onload = main
