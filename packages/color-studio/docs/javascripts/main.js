/* eslint-env browser */

const chroma = require('chroma-js')
const copyToClipboard = require('copy-text-to-clipboard')
const flatten = require('lodash/flatten')
const round = require('lodash/round')
const { saveAs } = require('file-saver')
const toArray = require('lodash/toArray')
const toSketchPalette = require('../../utilities/to-sketch-palette')

const createPaletteColors = require('../../formula')
const foundations = require('../../foundations')

const COLOR_WHITE = '#ffffff'
const COLOR_BLACK = '#000000'
const SKETCH_COLOR_PICKER_ROW_COUNT = 8

const input = document.getElementById('base-color')
const output = document.getElementById('color-tiles')
const button = document.getElementById('download-button')

let currentBaseColor = null

setTimeout(init, 0)

function init() {
  if (!input) {
    handleFoundationTiles()
    handleFoundationButton()
  } else {
    button.addEventListener('click', handleButtonClick)
    input.addEventListener('input', event => {
      handleColor(String(event.target.value).trim())
    })
    handleRandomColor()
  }
}

function handleColor(color) {
  try {
    currentBaseColor = chroma(color).hex()
  } catch (e) {
    currentBaseColor = null
  }

  setBodyBackground()
  setContent()
  setButton()
}

function handleButtonClick() {
  if (currentBaseColor) {
    const colors = createPaletteColors(currentBaseColor).map(c => c.color)
    makeDownloadable(colors)
  }
}

function makeDownloadable(colors) {
  const contents = toSketchPalette(colors)
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' })
  const name = `colors-${Date.now()}.sketchpalette`

  saveAs(blob, name)
}

function handleFoundationTiles() {
  output.innerHTML = foundations.baseColors
    .map(c => createColorTiles(c.value, true))
    .join('')

  activateTiles(output)
}

function handleFoundationButton() {
  const palettes = foundations.baseColors.map(color => {
    const palette = createPaletteColors(color.value).map(colorObject => {
      return colorObject.color
    })

    while (palette.length % SKETCH_COLOR_PICKER_ROW_COUNT > 0) {
      palette.unshift(COLOR_WHITE)
    }

    return palette
  })

  const colors = flatten(palettes)
  button.addEventListener('click', () => {
    makeDownloadable(colors)
  })
}

function handleRandomColor() {
  const color = chroma.random().hex()
  input.value = color
  handleColor(color)
}

function createColorTiles(color, pad) {
  const colors = createPaletteColors(color)
  const html = colors.map(createColorTile).join('')
  return `<div class="d-flex bg-white${pad ? ' pt-1' : ''}">${html}</div>`
}

function setBodyBackground() {
  document.body.style.background = currentBaseColor || COLOR_WHITE
}

function setContent() {
  if (!currentBaseColor) {
    output.innerHTML = ''
  } else {
    output.innerHTML = createColorTiles(currentBaseColor)
    activateTiles(output)
  }
}

function setButton() {
  if (!currentBaseColor) {
    button.setAttribute('disabled', '')
  } else {
    button.removeAttribute('disabled')
  }
}

function activateTiles(scope = document) {
  toArray(scope.getElementsByClassName('tile')).forEach(element => {
    const color = String(element.dataset.color).trim()
    element.addEventListener('click', () => copyToClipboard(color))
  })
}

function createColorTile(colorObject) {
  const { index, color } = colorObject

  const [primaryTextColor, secondaryTextColor] = determineTextColor(color)
  const className = `tile tile--${index} text-center`

  /* eslint-disable indent */
  return [
    `<div class="${className}" style="background: ${color}; color: ${primaryTextColor}" data-color="${color}">`,
      `<div class="tile__title font-weight-bold">`,
        index,
      '</div>',
      `<div class="tile__meta text-uppercase" style="color: ${secondaryTextColor}">`,
        color,
      '</div>',
      `<div class="tile__meta tile__meta--tiny text-uppercase" style="color: ${secondaryTextColor}">`,
        '<span title="Contrast / Saturation / Lightness">',
          getColorProperties(color),
        '</span>',
      '</div>',
    '</div>'
  ].join('')
  /* eslint-enable indent */
}

function determineTextColor(backgroundColor) {
  const hasContrast = c => chroma.contrast(backgroundColor, c) >= 6
  const fadeColor = (c, r = 0.65) => chroma.mix(backgroundColor, c, r).hex()

  let color = backgroundColor

  if (hasContrast(COLOR_WHITE)) {
    color = COLOR_WHITE
  } else {
    do {
      color = chroma(color).darken().hex()
    } while (!hasContrast(color) && color !== COLOR_BLACK)
  }

  return [color, fadeColor(color)]
}

function getColorProperties(colorValue) {
  const color = chroma(colorValue)
  const numbers = [
    chroma.contrast(colorValue, COLOR_WHITE),
    color.get('hsl.s'),
    color.get('hsl.l')
  ]

  return numbers.map(n => round(n, 2)).join(' / ')
}