#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const elasticsearch = require('elasticsearch')
const program = require('commander')
const ora = require('ora')
const async = require('async')
const filename = require('filename')

const spinner = ora({
  color: 'green',
  spinner: process.argv[2]
})

// COMMAND
program
  .version('1.0.0')
  .command('create [path]')
  .option('-f, --force', 'Force the creation of index.')
  .option('-h, --host [optional]', 'The host URL of ElasticSearch.', 'localhost:9200')
  .action((dirpath, options) => {
    const directory = dirpath ? (path.isAbsolute(dirpath) ? dirpath : path.resolve(process.cwd(), dirpath)) : process.cwd()
    const {host, force} = options

    // SPINNER
    spinner.start('Mapping ElasticSearch database.')

    const client = new elasticsearch.Client({
      host: host
    })

    // STEPS
    const getStats = callback => fs.stat(directory, callback)

    const getFilePaths = (stats, callback) => stats.isDirectory() ? fs.readdir(directory, callback) : callback(null, [directory])

    const loadFiles = (files, callback) => {
      const tasks = files.map(file => done => {
        done(null, {
          index: filename(file),
          body: require(path.resolve(directory, file))
        })
      })

      async.parallel(tasks, callback)
    }

    // ES part
    const dropExisitingOrForce = (mappings, callback) => {
      async.filter(mappings, (mapping, done) => {
        client.indices.exists({index: mapping.index}, (err, exists) => {
          if (err) {
            done(err)
          }
          if (exists && force) {
            // spinner.warn(`${mapping.index} is going to be delete.`)
            client.indices.delete({index: mapping.index}, (err, res) => {
              if (err) {
                done(err)
              }
              if (res.acknowledged) {
                done(null, true)
              } else {
                done(new Error(`${mapping.index} delete rejected: ${res}`))
              }
            })
          } else if (exists && !force) {
            // spinner.warn(`${mapping.index} already exists. Use -f (force option) to force recreate.`)
            done(null, false)
          } else {
            done(null, true)
          }
        })
      }, callback)
    }

    const createIndices = (mappings, callback) => {
      spinner.succeed('Gathered config files.')
      async.each(mappings, (mapping, done) => {
        client.indices.create(mapping, (err, res) => {
          if (err) {
            done(err)
          }
          if (!res.acknowledged || !res.shards_acknowledged) {
            done(new Error(`${mapping.index} creation unsuccessful: ${res}`))
          } else {
            done(null)
          }
        })
      }, err => {
        if (err) {
          callback(err)
        }
        callback(null, mappings)
      })
    }

    // Fire them off!
    async.waterfall([
      getStats,
      getFilePaths,
      loadFiles,
      dropExisitingOrForce,
      createIndices
    ], (err, res) => {
      if (err) {
        spinner.fail(`:(`)
        throw err
      }
      if (res.length === 0) {
        spinner.succeed(`No indices created. Use -f (force) option to force index recreation.`)
      } else {
        spinner.succeed(`Successfully created ${res.length} ${res.length === 1 ? 'index' : 'indices'}! ${res.map(m => m.index)}`)
      }
    })
  })

program
  .version('1.0.0')
  .command('delete [index]')
  .option('-h, --host [optional]', 'The host URL of ElasticSearch.', 'localhost:9200')
  .action((index, options) => {
    const {host} = options

    // SPINNER
    spinner.start('Deleting index.')

    const client = new elasticsearch.Client({
      host: host
    })

    client.indices.delete({index: (index || '_all')}, (err, res) => {
      if (err) {
        spinner.fail(`Error occured. ${err}`)
      }
      if (res.acknowledged) {
        spinner.succeed('Index delete!')
      } else {
        spinner.fail(`Deleting index failed. ${res}`)
      }
      spinner.stop()
    })
  })

program.parse(process.argv)
