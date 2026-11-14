"""
Voice Catalog for AudioBooked.
Rich metadata, literary traits, character personas, and sample quotes for all 54 Kokoro neural voices.
"""

from typing import Dict, Any, List

VOICE_CATALOG: Dict[str, Dict[str, Any]] = {
    # ----------------- American Female (11 voices) -----------------
    "af_heart": {
        "id": "af_heart",
        "name": "Heart",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "narrator",
        "tags": ["Default Narrator", "Warm", "Literary", "Parchment"],
        "description": "Warm, velvety, intimate storytelling cadence. Superb for classical prose, long-form literature, and main narration.",
        "sample_quote": "The ancient library held secrets woven in silence, waiting for a reader to turn the page."
    },
    "af_bella": {
        "id": "af_bella",
        "name": "Bella",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "dialogue",
        "tags": ["Lead Dialogue", "Expressive", "Crisp Diction"],
        "description": "Bright, expressive, energetic cadence with sharp diction. Perfect for spirited heroines and fast-paced conversation.",
        "sample_quote": "“Did you really believe you could slip away without telling me?” she asked with a grin."
    },
    "af_sky": {
        "id": "af_sky",
        "name": "Sky",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "thought",
        "tags": ["Internal Thought", "Reflective", "Breathy"],
        "description": "Gentle, reflective, atmospheric, slightly breathy tone. Tailored for internal monologue and poetic contemplation.",
        "sample_quote": "Perhaps, in the quiet spaces between heartbeats, truth finally finds its voice."
    },
    "af_sarah": {
        "id": "af_sarah",
        "name": "Sarah",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "narrator",
        "tags": ["Documentary", "Articulate", "Authoritative"],
        "description": "Steady, mature, balanced narration with impeccable pacing. Ideal for historical fiction, mystery, and biographies.",
        "sample_quote": "Across five dynasties, the imperial archives remained the ultimate repository of continental law."
    },
    "af_nicole": {
        "id": "af_nicole",
        "name": "Nicole",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "dialogue",
        "tags": ["Casual", "Vibrant", "Modern"],
        "description": "Warm, natural conversational cadence with relatable cadence. Great for school life, urban fantasy, and modern slice-of-life.",
        "sample_quote": "“Come on, if we don't hurry, the guild meeting will start without us!”"
    },
    "af_alloy": {
        "id": "af_alloy",
        "name": "Alloy",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "narrator",
        "tags": ["Neutral", "Modern", "Clear"],
        "description": "Balanced, clear, contemporary American female tone. Highly versatile for science fiction and modern fiction.",
        "sample_quote": "The navigation console flickered to life as the ship entered orbit above the uncharted planet."
    },
    "af_aoede": {
        "id": "af_aoede",
        "name": "Aoede",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "narrator",
        "tags": ["Lyrical", "Poetic", "Serene"],
        "description": "Melodic, serene cadence named after the ancient muse of song. Suited for romance, poetry, and enchanted realms.",
        "sample_quote": "The river carried murmurs of blossoms fallen in spring, whispering songs of forgotten days."
    },
    "af_jessica": {
        "id": "af_jessica",
        "name": "Jessica",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "dialogue",
        "tags": ["Professional", "Direct", "Poised"],
        "description": "Sharp, articulate, self-assured. Excellent for scholars, mages, and sharp-tongued leaders.",
        "sample_quote": "“The calculations are exact. If we alter the formation now, the resonance will collapse.”"
    },
    "af_kore": {
        "id": "af_kore",
        "name": "Kore",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "dialogue",
        "tags": ["Innocent", "Sweet", "Youthful"],
        "description": "Gentle, sweet, youthful female tone with emotional innocence and sincerity.",
        "sample_quote": "“Look at the lantern festival lights! It feels like stars fell down into the valley.”"
    },
    "af_nova": {
        "id": "af_nova",
        "name": "Nova",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "narrator",
        "tags": ["Bright", "Dynamic", "Energetic"],
        "description": "Crisp, bright, forward projection. Engaging for fast-paced adventures and battle narratives.",
        "sample_quote": "With a blinding surge of golden aura, the spell barrier shattered into a thousand crystal fragments."
    },
    "af_river": {
        "id": "af_river",
        "name": "River",
        "gender": "female",
        "accent": "American",
        "language": "en-us",
        "role": "narrator",
        "tags": ["Mellow", "Smooth", "Relaxed"],
        "description": "Tranquil, unhurried, flowing tone. Ideal for bedtime stories, slow-burn novels, and nature prose.",
        "sample_quote": "Rain fell softly across the cedar groves, each droplet soaking into the moss-covered earth."
    },

    # ----------------- American Male (9 voices) -----------------
    "am_adam": {
        "id": "am_adam",
        "name": "Adam",
        "gender": "male",
        "accent": "American",
        "language": "en-us",
        "role": "narrator",
        "tags": ["Epic Narrator", "Deep Baritone", "Classic"],
        "description": "Deep, grounded, resonant baritone. Ideal for high fantasy, thrillers, and authoritative narrator presence.",
        "sample_quote": "The northern winds blew cold across the fortress walls as twilight settled on the realm."
    },
    "am_michael": {
        "id": "am_michael",
        "name": "Michael",
        "gender": "male",
        "accent": "American",
        "language": "en-us",
        "role": "dialogue",
        "tags": ["Male Lead", "Charismatic", "Dynamic"],
        "description": "Confident, dynamic, and naturally expressive. Superb for heroic dialogue and modern male leads.",
        "sample_quote": "“Hold your line,” he said calmly, stepping forward. “We finish this together.”"
    },
    "am_echo": {
        "id": "am_echo",
        "name": "Echo",
        "gender": "male",
        "accent": "American",
        "language": "en-us",
        "role": "character",
        "tags": ["Dark Fantasy", "Enigmatic", "Low Resonant"],
        "description": "Subtle, shadowed, enigmatic bass tone. Excellent for villains, anti-heroes, and supernatural entities.",
        "sample_quote": "“You walk in shadows you do not understand,” whispered the stranger from the dark."
    },
    "am_eric": {
        "id": "am_eric",
        "name": "Eric",
        "gender": "male",
        "accent": "American",
        "language": "en-us",
        "role": "thought",
        "tags": ["Contemplative", "Introspective", "Warm"],
        "description": "Warm, introspective, conversational male timbre suited for male interior thought and confessional prose.",
        "sample_quote": "If I step through this gate, there will be no turning back."
    },
    "am_fenrir": {
        "id": "am_fenrir",
        "name": "Fenrir",
        "gender": "male",
        "accent": "American",
        "language": "en-us",
        "role": "character",
        "tags": ["Gravelly", "Warrior", "Fierce"],
        "description": "Grizzled, deep, rugged tone. Perfect for commanders, mercenaries, and seasoned warriors.",
        "sample_quote": "“Steel sharpens steel. If you wish to challenge the pack, show your fangs!”"
    },
    "am_liam": {
        "id": "am_liam",
        "name": "Liam",
        "gender": "male",
        "accent": "American",
        "language": "en-us",
        "role": "dialogue",
        "tags": ["Youthful", "Earnest", "Quick"],
        "description": "Young, earnest, bright male voice for younger protagonists and fast-paced interaction.",
        "sample_quote": "“I don't care how impossible the odds look—I'm not leaving anyone behind!”"
    },
    "am_onyx": {
        "id": "am_onyx",
        "name": "Onyx",
        "gender": "male",
        "accent": "American",
        "language": "en-us",
        "role": "narrator",
        "tags": ["Velvet Bass", "Measured", "Solemn"],
        "description": "Heavy, dark, measured cadence with cinematic gravitas. Ideal for gothic fiction and mythic lore.",
        "sample_quote": "Before the stars took flame, the ancient kings ruled beneath boundless darkness."
    },
    "am_puck": {
        "id": "am_puck",
        "name": "Puck",
        "gender": "male",
        "accent": "American",
        "language": "en-us",
        "role": "dialogue",
        "tags": ["Playful", "Witty", "Mischievous"],
        "description": "Quick-witted, slightly mocking, lively timbre for rogue characters, familiars, and tricksters.",
        "sample_quote": "“Oh, relax! Nobody died yet, and where's the fun without a little catastrophe?”"
    },
    "am_santa": {
        "id": "am_santa",
        "name": "Santa",
        "gender": "male",
        "accent": "American",
        "language": "en-us",
        "role": "character",
        "tags": ["Jovial", "Warm Elder", "Booming"],
        "description": "Hearty, booming, grandfatherly warmth with genuine cheer.",
        "sample_quote": "“Ho ho! Welcome in from the snow, my dear friend. Warm your hands by the hearth!”"
    },

    # ----------------- British Female (4 voices) -----------------
    "bf_alice": {
        "id": "bf_alice",
        "name": "Alice",
        "gender": "female",
        "accent": "British",
        "language": "en-gb",
        "role": "narrator",
        "tags": ["British RP", "Whimsical", "Fairytale"],
        "description": "Soft English accent with storybook cadence. Wonderful for classic fantasy, children's literature, and Victorian mystery.",
        "sample_quote": "Down through the hollow elder tree, a staircase of carved roots led into perpetual twilight."
    },
    "bf_emma": {
        "id": "bf_emma",
        "name": "Emma",
        "gender": "female",
        "accent": "British",
        "language": "en-gb",
        "role": "narrator",
        "tags": ["British Classic", "Regal", "Refined"],
        "description": "Aristocratic, poised British Received Pronunciation. Ideal for period drama, Jane Austen style, and nobility.",
        "sample_quote": "It is a truth universally acknowledged that a quiet manor on a stormy evening harbors many confidences."
    },
    "bf_isabella": {
        "id": "bf_isabella",
        "name": "Isabella",
        "gender": "female",
        "accent": "British",
        "language": "en-gb",
        "role": "dialogue",
        "tags": ["Dramatic", "Noble", "Crisp RP"],
        "description": "Regal, theatrical British cadence with cutting clarity. Superb for royalty, archduchesses, and dramatic antagonists.",
        "sample_quote": "“You presume too much, sir. My family's honor is not a commodity for bargain.”"
    },
    "bf_lily": {
        "id": "bf_lily",
        "name": "Lily",
        "gender": "female",
        "accent": "British",
        "language": "en-gb",
        "role": "thought",
        "tags": ["Gentle", "Melancholy", "Poetic"],
        "description": "Delicate, emotive English voice with touching sincerity. Ideal for emotional climaxes and introspective diary entries.",
        "sample_quote": "I watched the autumn leaves gather in the fountain courtyard, wondering if spring would remember us."
    },

    # ----------------- British Male (4 voices) -----------------
    "bm_daniel": {
        "id": "bm_daniel",
        "name": "Daniel",
        "gender": "male",
        "accent": "British",
        "language": "en-gb",
        "role": "thought",
        "tags": ["Scholarly", "Reflective", "British Male"],
        "description": "Cultured, measured British male voice with an intellectual, contemplative tone.",
        "sample_quote": "To unravel such an arcane riddle requires patience far greater than passion."
    },
    "bm_fable": {
        "id": "bm_fable",
        "name": "Fable",
        "gender": "male",
        "accent": "British",
        "language": "en-gb",
        "role": "narrator",
        "tags": ["Bardic", "Folklore", "Adventure"],
        "description": "Rhythmic, theatrical English bard tone. Perfect for recounting legends, tavern tales, and epic lore.",
        "sample_quote": "Gather round the embers, travelers, and hear the chronicle of the Seventh Wyrm."
    },
    "bm_george": {
        "id": "bm_george",
        "name": "George",
        "gender": "male",
        "accent": "British",
        "language": "en-gb",
        "role": "narrator",
        "tags": ["Stately BBC", "Historical", "Epic"],
        "description": "Deep, stately British narrator with exceptional cadence and weight. The definitive voice for grand fantasy and historical chronicles.",
        "sample_quote": "London was bathed in gaslight and damp mist when Inspector Finch arrived at the docks."
    },
    "bm_lewis": {
        "id": "bm_lewis",
        "name": "Lewis",
        "gender": "male",
        "accent": "British",
        "language": "en-gb",
        "role": "dialogue",
        "tags": ["Polished", "Gentleman", "Articulate"],
        "description": "Crisp, gentlemanly British male cadence. Ideal for noble knights, detectives, and refined lords.",
        "sample_quote": "“Allow me to handle the negotiations. Some matters require a rather delicate touch.”"
    },

    # ----------------- International Accents (26 voices) -----------------
    # Spanish
    "ef_dora": {
        "id": "ef_dora",
        "name": "Dora",
        "gender": "female",
        "accent": "Spanish",
        "language": "es",
        "role": "character",
        "tags": ["Spanish", "Warm", "Expressive"],
        "description": "Expressive European Spanish female voice with rhythmic vitality.",
        "sample_quote": "La noche estrellada cubría el valle con un manto de silencio y misterio."
    },
    "em_alex": {
        "id": "em_alex",
        "name": "Alex",
        "gender": "male",
        "accent": "Spanish",
        "language": "es",
        "role": "character",
        "tags": ["Spanish", "Clear", "Modern"],
        "description": "Clear, grounded Spanish male voice for Latin prose and dialogue.",
        "sample_quote": "El viento del norte traía los ecos de una leyenda olvidada por el tiempo."
    },
    "em_santa": {
        "id": "em_santa",
        "name": "Papá Noel",
        "gender": "male",
        "accent": "Spanish",
        "language": "es",
        "role": "character",
        "tags": ["Spanish", "Jovial", "Elder"],
        "description": "Hearty, resonant Spanish elder timbre.",
        "sample_quote": "¡Felices fiestas y buena ventura a todos los viajeros del camino!"
    },

    # French
    "ff_siwis": {
        "id": "ff_siwis",
        "name": "Siwis",
        "gender": "female",
        "accent": "French",
        "language": "fr",
        "role": "character",
        "tags": ["French", "Elegant", "Melodic"],
        "description": "Elegant Parisian French female voice with smooth poetic cadence.",
        "sample_quote": "Les secrets de l'ancien château s'éveillaient au premier rayon de l'aube."
    },

    # Hindi
    "hf_alpha": {
        "id": "hf_alpha",
        "name": "Alpha (Hindi)",
        "gender": "female",
        "accent": "Hindi",
        "language": "hi",
        "role": "character",
        "tags": ["Hindi", "Warm", "Gentle"],
        "description": "Melodic, gentle Hindi female voice with authentic classical enunciation.",
        "sample_quote": "प्राचीन पुस्तकालय में समय ठहर गया था, मानो हर पृष्ठ एक नया रहस्य कह रहा हो।"
    },
    "hf_beta": {
        "id": "hf_beta",
        "name": "Beta (Hindi)",
        "gender": "female",
        "accent": "Hindi",
        "language": "hi",
        "role": "character",
        "tags": ["Hindi", "Clear", "Expressive"],
        "description": "Crisp and expressive Hindi female cadence.",
        "sample_quote": "रात के सन्नाटे में दूर पहाड़ों से एक रहस्यमयी ध्वनि सुनाई दे रही थी।"
    },
    "hm_omega": {
        "id": "hm_omega",
        "name": "Omega (Hindi)",
        "gender": "male",
        "accent": "Hindi",
        "language": "hi",
        "role": "character",
        "tags": ["Hindi", "Deep", "Narrative"],
        "description": "Deep, stately Hindi male narration voice.",
        "sample_quote": "इतिहास के पन्नों में वही अमर रहते हैं जो आंधियों से टकराने का साहस रखते हैं।"
    },
    "hm_psi": {
        "id": "hm_psi",
        "name": "Psi (Hindi)",
        "gender": "male",
        "accent": "Hindi",
        "language": "hi",
        "role": "character",
        "tags": ["Hindi", "Dynamic", "Dialogue"],
        "description": "Dynamic Hindi male dialogue voice with energetic cadence.",
        "sample_quote": "“अगर हमने आज कदम नहीं बढ़ाया, तो आने वाला कल हमें कभी माफ नहीं करेगा।”"
    },

    # Italian
    "if_sara": {
        "id": "if_sara",
        "name": "Sara",
        "gender": "female",
        "accent": "Italian",
        "language": "it",
        "role": "character",
        "tags": ["Italian", "Passionate", "Lyrical"],
        "description": "Lyrical, vibrant Italian female voice full of color and musical cadence.",
        "sample_quote": "Il mare sussurrava antiche storie dimenticate sotto la luna d'argento."
    },
    "im_nicola": {
        "id": "im_nicola",
        "name": "Nicola",
        "gender": "male",
        "accent": "Italian",
        "language": "it",
        "role": "character",
        "tags": ["Italian", "Warm", "Classic"],
        "description": "Warm, resonant Italian male voice with cultured cadence.",
        "sample_quote": "Tra le colline toscane, ogni pietra racconta la storia di un tempo passato."
    },

    # Japanese
    "jf_alpha": {
        "id": "jf_alpha",
        "name": "Alpha (Japanese)",
        "gender": "female",
        "accent": "Japanese",
        "language": "ja",
        "role": "character",
        "tags": ["Japanese", "Polite", "Clear"],
        "description": "Polite, clear Japanese female narrator tone.",
        "sample_quote": "古びた図書館の奥深く、忘れられた物語が静かに息をひそめていた。"
    },
    "jf_gongitsune": {
        "id": "jf_gongitsune",
        "name": "Gongitsune",
        "gender": "female",
        "accent": "Japanese",
        "language": "ja",
        "role": "character",
        "tags": ["Japanese", "Folklore", "Gentle"],
        "description": "Gentle traditional Japanese storytelling voice.",
        "sample_quote": "夕暮れの森に、小さな狐の足音が静かに響いていました。"
    },
    "jf_nezumi": {
        "id": "jf_nezumi",
        "name": "Nezumi",
        "gender": "female",
        "accent": "Japanese",
        "language": "ja",
        "role": "character",
        "tags": ["Japanese", "Playful", "Cute"],
        "description": "Lively, youthful Japanese female character tone.",
        "sample_quote": "「ねえ、見て！あそこに光るものがあるよ、一緒に行ってみよう！」"
    },
    "jf_tebukuro": {
        "id": "jf_tebukuro",
        "name": "Tebukuro",
        "gender": "female",
        "accent": "Japanese",
        "language": "ja",
        "role": "character",
        "tags": ["Japanese", "Warm", "Storybook"],
        "description": "Cozy, warm Japanese storybook narration.",
        "sample_quote": "雪の降る寒い夜、森の動物たちが暖炉の周りに集まりました。"
    },
    "jm_kumo": {
        "id": "jm_kumo",
        "name": "Kumo",
        "gender": "male",
        "accent": "Japanese",
        "language": "ja",
        "role": "character",
        "tags": ["Japanese", "Deep", "Narrative"],
        "description": "Grounded, atmospheric Japanese male narrator.",
        "sample_quote": "空を覆う雲の彼方から、遥かなる鐘の音が微かに聞こえてきた。"
    },

    # Portuguese
    "pf_dora": {
        "id": "pf_dora",
        "name": "Dora (PT)",
        "gender": "female",
        "accent": "Portuguese",
        "language": "pt",
        "role": "character",
        "tags": ["Portuguese", "Smooth", "Warm"],
        "description": "Smooth, gentle Brazilian/European Portuguese female voice.",
        "sample_quote": "A brisa suave do oceano trazia lembranças de viagens distantes."
    },
    "pm_alex": {
        "id": "pm_alex",
        "name": "Alex (PT)",
        "gender": "male",
        "accent": "Portuguese",
        "language": "pt",
        "role": "character",
        "tags": ["Portuguese", "Modern", "Clear"],
        "description": "Clear Portuguese male dialogue voice.",
        "sample_quote": "Nas ruas antigas da cidade, a história ganha vida a cada esquina."
    },
    "pm_santa": {
        "id": "pm_santa",
        "name": "Papai Noel",
        "gender": "male",
        "accent": "Portuguese",
        "language": "pt",
        "role": "character",
        "tags": ["Portuguese", "Elder", "Jovial"],
        "description": "Jovial Portuguese elder voice.",
        "sample_quote": "Boas festas e uma jornada repleta de luz a todos os corações!"
    },

    # Mandarin Chinese
    "zf_xiaobei": {
        "id": "zf_xiaobei",
        "name": "Xiaobei",
        "gender": "female",
        "accent": "Mandarin",
        "language": "zh",
        "role": "character",
        "tags": ["Mandarin", "Gentle", "Storytelling"],
        "description": "Gentle, expressive Mandarin female voice for audiobooks.",
        "sample_quote": "古老的庭院里落英缤纷，微风中似乎还留着昨夜的余香。"
    },
    "zf_xiaoni": {
        "id": "zf_xiaoni",
        "name": "Xiaoni",
        "gender": "female",
        "accent": "Mandarin",
        "language": "zh",
        "role": "character",
        "tags": ["Mandarin", "Sweet", "Youthful"],
        "description": "Sweet, crisp Mandarin female voice.",
        "sample_quote": "“你看那边的星空，像不像无数颗闪烁的琉璃宝石？”"
    },
    "zf_xiaoxiao": {
        "id": "zf_xiaoxiao",
        "name": "Xiaoxiao",
        "gender": "female",
        "accent": "Mandarin",
        "language": "zh",
        "role": "character",
        "tags": ["Mandarin", "Professional", "Clear"],
        "description": "Standard, clear broadcasting Mandarin female tone.",
        "sample_quote": "在浩瀚的历史长河中，无数英雄豪杰书写了属于自己的传奇篇章。"
    },
    "zf_xiaoyi": {
        "id": "zf_xiaoyi",
        "name": "Xiaoyi",
        "gender": "female",
        "accent": "Mandarin",
        "language": "zh",
        "role": "character",
        "tags": ["Mandarin", "Warm", "Narrative"],
        "description": "Warm, emotional Mandarin female voice.",
        "sample_quote": "时光悄然流逝，唯有文字能留住记忆深处最初的心动。"
    },
    "zm_yunjian": {
        "id": "zm_yunjian",
        "name": "Yunjian",
        "gender": "male",
        "accent": "Mandarin",
        "language": "zh",
        "role": "character",
        "tags": ["Mandarin", "Heroic", "Xianxia"],
        "description": "Clear, upright, heroic Mandarin male voice. Perfect for Wuxia and cultivation fantasy.",
        "sample_quote": "“剑指苍穹，纵使前路有万千险阻，我亦一往无前！”"
    },
    "zm_yunxi": {
        "id": "zm_yunxi",
        "name": "Yunxi",
        "gender": "male",
        "accent": "Mandarin",
        "language": "zh",
        "role": "character",
        "tags": ["Mandarin", "Scholarly", "Gentle"],
        "description": "Refined, gentle scholar tone in Mandarin.",
        "sample_quote": "窗外细雨绵绵，案几上一卷墨香，岁月在此刻变得宁静悠长。"
    },
    "zm_yunxia": {
        "id": "zm_yunxia",
        "name": "Yunxia",
        "gender": "male",
        "accent": "Mandarin",
        "language": "zh",
        "role": "character",
        "tags": ["Mandarin", "Dramatic", "Dynamic"],
        "description": "Dynamic, storytelling male narrator for serialized audio.",
        "sample_quote": "雷声滚滚，风云变幻，这片大陆即将迎来一场前所未有的风暴。"
    },
    "zm_yunyang": {
        "id": "zm_yunyang",
        "name": "Yunyang",
        "gender": "male",
        "accent": "Mandarin",
        "language": "zh",
        "role": "character",
        "tags": ["Mandarin", "Deep Baritone", "Epic"],
        "description": "Deep, authoritative, historical Mandarin male baritone.",
        "sample_quote": "万里山河，巍峨苍茫，千古风流人物皆归尘土。"
    }
}

def get_voice_info(voice_id: str) -> Dict[str, Any]:
    """Return metadata for a voice, falling back to dynamic metadata if uncataloged."""
    if voice_id in VOICE_CATALOG:
        return VOICE_CATALOG[voice_id]
    
    # Check if this is a saved custom blended voice
    if voice_id.startswith("cv_"):
        try:
            from database import DB
            cv = DB.get_custom_voice(voice_id)
            if cv:
                ratio_pct = int(cv.get("blend_ratio", 0.3) * 100)
                base_pct = 100 - ratio_pct
                return {
                    "id": cv["id"],
                    "name": cv["name"],
                    "gender": "custom",
                    "accent": "Hybrid",
                    "language": "en",
                    "role": "character",
                    "tags": ["Custom Blend", f"{base_pct}% {cv['base_voice']}", f"{ratio_pct}% {cv['blend_voice']}"],
                    "description": cv.get("description") or f"Custom blended voice: {base_pct}% {cv['base_voice']} + {ratio_pct}% {cv['blend_voice']}.",
                    "sample_quote": "This is an audition sample of your custom blended voice.",
                    "is_custom": True,
                    "base_voice": cv["base_voice"],
                    "blend_voice": cv["blend_voice"],
                    "blend_ratio": cv["blend_ratio"],
                    "expression": cv["expression"]
                }
        except Exception:
            pass

    # Heuristic parsing
    name = voice_id.replace("_", " ").title()
    gender = "female" if "f" in voice_id[:2] else "male"
    accent = "American" if voice_id.startswith("a") else ("British" if voice_id.startswith("b") else "International")
    
    return {
        "id": voice_id,
        "name": name,
        "gender": gender,
        "accent": accent,
        "language": "en",
        "role": "character",
        "tags": [accent, gender.capitalize()],
        "description": f"Kokoro neural voice {voice_id}.",
        "sample_quote": f"This is an audition sample of the {name} voice."
    }

def get_all_voice_metadata() -> Dict[str, Dict[str, Any]]:
    return VOICE_CATALOG
