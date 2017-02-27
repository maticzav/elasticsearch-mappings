[![Build Status](https://travis-ci.org/maticzav/elasticsearch-mappings.svg?branch=master)](https://travis-ci.org/maticzav/elasticsearch-mappings)

# ElasticSearch - Mappings
A simple `elasticsearch` helper CLI tool, written in nodejs.
Use to upload index mappings to database in a simple way.

## How to Use
1. Add mapping settings to one folder.
2. File names must match index names and have `json` format.
3. Everything else happens automatically.

```
elasticsearch-mappings create [path] [-h] [-f]
elasticsearch-mappings delete <index>
```

__Options:__
- ``[path]``: optional path to a mappings file or directory (current directory will be used by default).
- ``[-h, --host]``: optional elasticsearch host parameter (default: localhost:9200)
- ``[-f, --force]``: force recreation of indices.

## Files
A file named `foo.json` inside `/mappings` folder will result in the creation
of an index named foo and will have settings described in a file.

> `NOTE`: elasticsearch-mappings by default doesn't look for `/mappings` directory!

__elasticsearch-mappings support all settings options defined in elasticsearch reference.__

Reference: [mappings](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)

## Example
Running `elasticsearch-mappings create ./example` will create two indices, `bar` and `foo`.
Running `elasticsearch-mappings create ./example/bar.json` will create only one index, `bar`.

## Contribution
- Fork the repo.
- Change the code.
- Create a PR.

__If you find a bug, open an issue or create a PR.__
