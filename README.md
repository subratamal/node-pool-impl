## Classified Website Scraper

### Installation
- Node.JS v8
- Yarn: `sudo npm install -g yarn`
- Project dependencies: `yarn install`

### Config
Create `config.yaml` file in project directory.
*See `config.sample.yaml` for sample config.*

```yaml
# config.yaml file

# required config

db:
  host: localhost
  port: 3306
  username: root
  password: r@@00oot
  db_name: smswords_project

# option config

stats:
  counting_field: links_found
  flush_threshold: 50

phone_number:
  flush_threshold: 50

schedule:
  sleep_time: 7d

proxy:
  sleep_time: [5s, 10s]

# site specific config

sites:
  example_com:
    disabled: true
    proxy:
      sleep_time: [10, 20s]
    schedule:
      sleep_time: 5d

```

### Run
```shell
# run with node
node .

# or run with pm2
pm2 start . --name scraper
```
