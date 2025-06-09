require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const axiosRetry = require('axios-retry').default;
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;

//levantar ngrok npx ngrok http 3000
app.post('/webhook', async (req, res) => {
    try {
        const incomingMsg = req.body.Body;
        const from = req.body.From;

        console.log(`Mensaje recibido de ${from}: ${incomingMsg}`);

        // const gptResponse = await axios.post(
        //     'https://api.openai.com/v1/chat/completions',
        //     {
        //         model: 'gpt-4o',
        //         messages: [
        //             { role: 'system', content: 'Eres un asistente de WhatsApp amigable.' },
        //             { role: 'user', content: incomingMsg }
        //         ],
        //         max_tokens: 300,
        //     },
        //     {
        //         headers: {
        //             'Content-Type': 'application/json',
        //             'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        //         },
        //     }
        // );

        // const reply = gptResponse.data.choices[0].message.content.trim();

        const reply = 'Hola tengo horas disponibles para mañana Lunes en la tarde. 😊😊😊'; // Simulación de resp

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
