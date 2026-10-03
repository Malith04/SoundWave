import serverless from 'serverless-http'
import app from '../../server/src/app.js'

// Export serverless handler for Netlify
export const handler = serverless(app)
