const rollup = require('rollup')
const path = require('path')


const resolve = filePath => path.resolve(__dirname, '..', filePath)

const outputConfig = {
  'es': {
    file: resolve('dist/jsbmp.esm.js'),
    format: 'es'
  },
  'cjs': {
    file: resolve('dist/jsbmp.common.js'),
    format: 'cjs'
  },
  'umd': {
    file: resolve('dist/jsbmp.js'),
    format: 'umd',
    name: 'jsbmp'
  }
}

async function build() {
  const bundle = await rollup.rollup({
    input: resolve('src/index.js')
  })
  Object.keys(outputConfig).forEach(value => {
    bundle.write(outputConfig[value])
  })
}

build()