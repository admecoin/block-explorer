import { getLatestData, getObject, getStats } from '/imports/startup/server/index.js'
import { Blocks, lasttx, homechart } from '/imports/api/index.js'


const refreshBlocks = () => {
  const request = { filter: 'BLOCKHEADERS', offset: 0, quantity: 5 }
  const response = Meteor.wrapAsync(getLatestData)(request)
  Blocks.remove({})
  Blocks.insert(response)
}

function refreshLasttx() {
  const request = { filter: 'TRANSACTIONS', offset: 0, quantity: 5 }
  const response = Meteor.wrapAsync(getLatestData)(request)
  response.transactions.forEach (function (item, index) {
    if (item.tx.transactionType == "token") {
      // Store plain text version of token symbol
      response.transactions[index].tx.tokenSymbol = 
        Buffer.from(item.tx.token.symbol).toString()
    } else if (item.tx.transactionType == "transfer_token") {
      // Request Token Symbol
      const symbolRequest = {
        query: Buffer.from(item.tx.transfer_token.token_txhash, 'hex')
      }
      const thisSymbolResponse = Meteor.wrapAsync(getObject)(symbolRequest)
      // Store symbol in response
      response.transactions[index].tx.tokenSymbol = 
        Buffer.from(thisSymbolResponse.transaction.tx.token.symbol).toString()
    }
  })

  lasttx.remove({})
  lasttx.insert(response)
}

function refreshHomeChart() {
  const res = Meteor.wrapAsync(getStats)({ include_timeseries: true })

  let chartLineData = {
    labels: [],
    datasets: [],
  }

  // Create chart axis objects
  let labels = []
  let hashPower = {
    label: 'Hash Power (hps)',
    borderColor: '#DC255D',
    backgroundColor: '#DC255D',
    fill: false,
    data: [],
    yAxisID: "y-axis-2",
    pointRadius: 0,
    borderWidth: 2,
  }
  let difficulty = {
    label: 'Difficulty',
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
    fill: false,
    data: [],
    yAxisID: "y-axis-2",
    pointRadius: 0,
    borderWidth: 2,
  }
  let movingAverage = {
    label: 'Block Time Average (s)',
    borderColor: '#0A0724',
    backgroundColor: '#0A0724',
    fill: false,
    data: [],
    yAxisID: "y-axis-1",
    pointRadius: 0,
    borderWidth: 2,
  }
  let blockTime = {
    label: 'Block Time (s)',
    borderColor: '#1EE9CB',
    backgroundColor: '#1EE9CB',
    fill: false,
    showLine: false,
    data: [],
    yAxisID: "y-axis-1",
    pointRadius: 2,
    borderWidth: 2,
  }

  // Loop all API responses and push data into axis objects
  _.each(res.block_timeseries, (entry) => {
    labels.push(entry.number)
    hashPower.data.push(entry.hash_power)
    difficulty.data.push(entry.difficulty)
    movingAverage.data.push(entry.time_movavg)
    blockTime.data.push(entry.time_last)
  })

  // Push axis objects into chart data
  chartLineData.labels = labels
  chartLineData.datasets.push(hashPower)
  chartLineData.datasets.push(difficulty)
  chartLineData.datasets.push(movingAverage)
  chartLineData.datasets.push(blockTime)

  // Save in mongo
  homechart.remove({})
  homechart.insert(chartLineData)
}

// Refresh blocks every 20 seconds
Meteor.setInterval(() => {
  refreshBlocks()
}, 20000)

// Refresh lasttx cache every 10 seconds
Meteor.setInterval(() => {
  refreshLasttx()
}, 10000)

// Refresh Home Chart Data every minute
Meteor.setInterval(() => {
  refreshHomeChart()
}, 60000)


// On first load - cache all elements.
Meteor.setTimeout(() => {
  refreshBlocks()
  refreshLasttx()
  refreshHomeChart()
}, 5000)

