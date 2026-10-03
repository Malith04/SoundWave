import serverless from 'serverless-http'
import app from '../../server/src/app.js'

// Export serverless handler with basePath configured for Netlify Functions
export const handler = serverless(app, {
  basePath: '/.netlify/functions/api'
})
