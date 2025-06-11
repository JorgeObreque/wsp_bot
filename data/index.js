require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const axiosRetry = require('axios-retry').default;
const { createClient } = require('redis');

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// Configuración peluquería
const SHOP_NAME = process.env.SHOP_NAME;
const SHOP_LOCATION = process.env.SHOP_LOCATION;
const SHOP_HOURS = process.env.SHOP_HOURS;
const SHOP_SERVICES = process.env.SHOP_SERVICES;
const BOT_NAME = process.env.BOT_NAME;
const SHOP_WEB = process.env.SHOP_WEB;

const PORT = process.env.PORT || 3000;
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

const SYSTEM_PROMPT = `
Eres ${BOT_NAME}, el asistente virtual de la peluquería "${SHOP_NAME}".

Datos de la peluquería:

- Nombre: ${SHOP_NAME}
- Ubicación: ${SHOP_LOCATION}
- Sitio web: ${SHOP_WEB}
- Horario de atención: ${SHOP_HOURS}
- Servicios que ofrecemos: ${SHOP_SERVICES}

Tu tarea es ayudar a los clientes a agendar turnos, responder dudas básicas y dar información sobre la peluquería.

Responde siempre de forma breve, amable y profesional.
Nunca inventes información fuera de estos datos.
`;

// Express config
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

//levantar ngrok npx ngrok http 3000
app.post('/webhook', async (req, res) => {
    try {
        const incomingMsg = req.body.Body;
        const from = req.body.From;

        console.log(`Mensaje recibido de ${from}: ${incomingMsg}`);

        // Obtener historial de Redis
        const historyKey = `history:${from}`;
        let history = await redisClient.get(historyKey);
        if (!history) {
            history = '';
        }

        // Construir prompt con historial
        const prompt = `
            ${SYSTEM_PROMPT}

            Historial de conversación con el cliente:

            ${history}

            Cliente: ${incomingMsg}
            Asistente:
            `;

        // Llamar a Ollama
        const ollamaResponse = await axios.post(
            `${OLLAMA_API_URL}/api/generate`,
            {
                model: 'mistral',
                prompt: prompt,
                stream: false
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const reply = ollamaResponse.data.response.trim();

        console.log(`Respuesta del modelo: ${reply}`);

        // Actualizar historial en Redis (mantener máximo 5 interacciones)
        let updatedHistory = `${history}\nCliente: ${incomingMsg}\nAsistente: ${reply}\n`;

        // Truncar historial (simple): mantener últimas 2000 chars
        if (updatedHistory.length > 2000) {
            updatedHistory = updatedHistory.slice(updatedHistory.length - 2000);
        }

        await redisClient.set(historyKey, updatedHistory);

        // Responder a WhatsApp
        res.set('Content-Type', 'text/xml');
        res.send(` 
            <Response>
                <Message>${reply}</Message>
            </Response>
        `);
    } catch (error) {
        console.error('Error al procesar mensaje:', error.message);
        res.status(500).send('Error interno');
    }
});

app.listen(PORT, () => {
    console.log(`Bot WhatsApp escuchando en puerto ${PORT}`);
});
