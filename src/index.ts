import express from 'express'

const app = express()
app.get('/', async (req, res, next) => {
  const name = req.query['name']
  res.send(name ? `Hello Mr. ${name}` : 'Hello World!')
  next()
})
app.listen(8080, () => console.log('Server started'))
