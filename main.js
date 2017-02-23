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
    const directory = dirpath ? (path.isAbsolute(dirpath) ? dirpath : path.resolve(__dirname, dirpath)) : __dirname
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

    const dropExisitingOrForce = (mappings, callback) => {
      async.filter(mappings, (mapping, done) => {
        client.indices.exists({index: mapping.index}, exists => {
          if (exists && force) {
            spinner.warn(`${mapping.index} is going to be delete.`)
          }
          done(null, !exists || force)
        })
      }, callback)
    }

    const createIndices = (mappings, callback) => {
      spinner.succeed('Gathered config files.')
      async.map(mappings, (mapping, done) => {
        client.indices.delete({index: mapping.index, ignore: [404]})
        .then(
          client.indices.create(mapping).then(() => done(null), err => done(err))
        )
      }, callback)
    }

    // Fire them off!
    async.waterfall([
      getStats,
      getFilePaths,
      loadFiles,
      dropExisitingOrForce,
      createIndices
    ], err => {
      if (err) {
        throw err
      }
      spinner.succeed('Done.')
    })
  })

program
  .version('1.0.0')
  .command('delete <index>')
  .option('-h, --host [optional]', 'The host URL of ElasticSearch.', 'localhost:9200')
  .action((index, options) => {
    const {host} = options

    // SPINNER
    spinner.start('Deleting index.')

    const client = new elasticsearch.Client({
      host: host
    })

    client.indices.delete({index: index, ignore: [404]}).then(res => {
      if (res.acknowledged) {
        spinner.succeed('Index delete!')
      } else {
        spinner.fail('Deleting index failed.')
      }
      spinner.stop()
    })
  })

program.parse(process.argv)
