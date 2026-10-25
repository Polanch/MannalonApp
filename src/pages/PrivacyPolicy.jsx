import { Link } from 'react-router-dom'
import '../assets/styles/chatbot.css'

function PrivacyPolicy() {
    return (
        <main className="chatbot-policy">
            <Link to="/">Mannalon home</Link>
            <h1>Privacy Policy: AI chatbot data notice</h1>
            <p>Notice version: 2026-10-18. This notice covers the farmer AI chatbot.</p>
            <h2>What is recorded</h2>
            <p>When you send a chatbot question, Mannalon stores your account identifier, conversation identifier,
                question, full AI reply, AI-assigned category, short response summary, cited IRRI links, timestamps,
                model information, token counts and the version of this notice. Authorized administrators can view these records.</p>
            <h2>OpenAI and IRRI</h2>
            <p>Your question and up to six recent question-and-answer pairs in the same conversation are sent to
                OpenAI to generate an Ilokano response. OpenAI performs web searches restricted to irri.org and its
                subdomains. The generated answer and current question are also sent to OpenAI to create a category
                and summary. This feature uses OpenAI API services, not your personal ChatGPT account.</p>
            <p>Mannalon requests that API responses are not stored as OpenAI response objects using the API store=false setting.
                This does not eliminate OpenAI processing or all provider retention.
                See <a href="https://openai.com/policies/api-data-usage-policies/" target="_blank" rel="noopener noreferrer">OpenAI API data policies</a>.
                IRRI is a source of information, not an endorsement of Mannalon or a guarantee that AI answers are correct.</p>
            <h2>Why chats are saved</h2>
            <p>Records support service review, understanding farmers&apos; questions, and possible preparation of a future
                Mannalon AI training dataset. Recording does not automatically train or fine-tune any model.
                AI replies, categories and summaries can be wrong and require human review.</p>
            <p>Before any future training, the operator must establish the appropriate legal basis, provide any
                additional required notice or consent, remove identifying information, review data quality and
                check rights to use source-derived content. Creating an account is not, by itself, proof of
                legally valid consent for every future use.</p>
            <h2>Your choices and record retention</h2>
            <p>Chatbot use is optional. A notice is shown before you send a question. Do not send passwords, contact
                details, financial information or other sensitive personal information. Starting a new chat
                does not delete previous records.</p>
            <p>Chat records currently have no automatic expiry and remain in the database until removed by an
                authorized operator. Contact your Mannalon administrator or municipal agriculture office to
                request access, correction, deletion, or to raise a concern about data use. There is currently
                no self-service deletion control.</p>
            <h2>Ilokano a pakdaar</h2>
            <p>Maipatulod iti OpenAI ken maidulin iti Mannalon dagiti saludsod ken sungbatmo. Makita dagiti
                awtorisado nga admin dagitoy a rekord. Saan nga automatiko a masursuruan ti AI babaen iti
                saritaan. Dika mangipatulod iti personal wenno sensitibo nga impormasion. Mabalinmo a saan
                nga usaren ti chatbot ken makiuman iti administrador no adda pakaseknam.</p>
        </main>
    )
}

export default PrivacyPolicy
