/* Modiv's Education - English / Hindi / Punjabi toggle.
   Matches each visible English text to a translation, so no extra markup is needed.
   Add new strings to D as  'English text': ['हिन्दी', 'ਪੰਜਾਬੀ']  */
(function(){
 var D={
 'Home':['होम','ਹੋਮ'],'Active leads':['सक्रिय लीड्स','ਐਕਟਿਵ ਲੀਡਸ'],'Find a tutor':['ट्यूटर खोजें','ਟਿਊਟਰ ਲੱਭੋ'],'Shop':['शॉप','ਸ਼ਾਪ'],'More':['और','ਹੋਰ'],
 'Our Vision':['हमारी सोच','ਸਾਡੀ ਸੋਚ'],'Modiv’s Vision':['मोदिव की सोच','ਮੋਦਿਵ ਦੀ ਸੋਚ'],'Our social vision':['हमारी सामाजिक सोच','ਸਾਡੀ ਸਮਾਜਿਕ ਸੋਚ'],'Guide':['गाइड','ਗਾਈਡ'],'Students’ Corner':['विद्यार्थी कोना','ਵਿਦਿਆਰਥੀ ਕੋਨਾ'],
 'Modiv’s Testimonials':['मोदिव्स प्रशंसापत्र','ਮੋਦਿਵਜ਼ ਪ੍ਰਸ਼ੰਸਾ-ਪੱਤਰ'],'Blogs':['ब्लॉग','ਬਲੌਗ'],'Contact us':['संपर्क करें','ਸੰਪਰਕ ਕਰੋ'],
 'Become a Tutor':['ट्यूटर बनें','ਟਿਊਟਰ ਬਣੋ'],'Log in':['लॉग इन','ਲੌਗ ਇਨ'],'Sign up':['साइन अप','ਸਾਈਨ ਅੱਪ'],'Menu':['मेन्यू','ਮੀਨੂ'],
 'Rooted in villages. Reaching the world.':['गाँवों में जड़ें, दुनिया तक पहुँच।','ਪਿੰਡਾਂ ਵਿੱਚ ਜੜ੍ਹਾਂ, ਦੁਨੀਆ ਤੱਕ ਪਹੁੰਚ।'],
 'Modiv’s Social vision':['मोदिव्स की सामाजिक सोच','ਮੋਦਿਵਜ਼ ਦੀ ਸਮਾਜਿਕ ਸੋਚ'],
 'Her knowledge.':['उसका ज्ञान।','ਉਸਦਾ ਗਿਆਨ।'],'Her classroom.':['उसकी कक्षा।','ਉਸਦੀ ਜਮਾਤ।'],'Her brighter future.':['उसका उज्ज्वल भविष्य।','ਉਸਦਾ ਰੌਸ਼ਨ ਭਵਿੱਖ।'],
 'A village should never be the boundary of a woman’s potential. Modiv’s Social vision helps rural women turn what they already know into online teaching, from their own homes.':['कोई गाँव किसी महिला की क्षमता की सीमा नहीं होना चाहिए। मोदिव्स की सामाजिक सोच ग्रामीण महिलाओं को उनके अपने घर से ही, जो वे पहले से जानती हैं उसे ऑनलाइन पढ़ाने में बदलने में मदद करती है।','ਕੋਈ ਪਿੰਡ ਕਿਸੇ ਔਰਤ ਦੀ ਸਮਰੱਥਾ ਦੀ ਹੱਦ ਨਹੀਂ ਹੋਣਾ ਚਾਹੀਦਾ। ਮੋਦਿਵਜ਼ ਦੀ ਸਮਾਜਿਕ ਸੋਚ ਪੇਂਡੂ ਔਰਤਾਂ ਨੂੰ ਆਪਣੇ ਘਰ ਤੋਂ ਹੀ, ਜੋ ਉਹ ਪਹਿਲਾਂ ਤੋਂ ਜਾਣਦੀਆਂ ਹਨ, ਉਸਨੂੰ ਆਨਲਾਈਨ ਪੜ੍ਹਾਉਣ ਵਿੱਚ ਬਦਲਣ ਵਿੱਚ ਮਦਦ ਕਰਦੀ ਹੈ।'],
 'Register for free →':['मुफ़्त रजिस्टर करें →','ਮੁਫ਼ਤ ਰਜਿਸਟਰ ਕਰੋ →'],'See how it works ↗':['देखें यह कैसे काम करता है ↗','ਵੇਖੋ ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ ↗'],
 '₹0 registration fee · Teach from home · Choose your own hours':['₹0 पंजीकरण शुल्क · घर से पढ़ाएँ · अपना समय खुद चुनें','₹0 ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਫੀਸ · ਘਰੋਂ ਪੜ੍ਹਾਓ · ਆਪਣਾ ਸਮਾਂ ਆਪ ਚੁਣੋ'],
 'A new chapter starts at home.':['घर से शुरू होता है एक नया अध्याय।','ਘਰ ਤੋਂ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ ਇੱਕ ਨਵਾਂ ਅਧਿਆਇ।'],
 'Your skills. Your voice. Your opportunity.':['आपके हुनर। आपकी आवाज़। आपका अवसर।','ਤੁਹਾਡਾ ਹੁਨਰ। ਤੁਹਾਡੀ ਆਵਾਜ਼। ਤੁਹਾਡਾ ਮੌਕਾ।'],
 'REGISTRATION':['पंजीकरण','ਰਜਿਸਟ੍ਰੇਸ਼ਨ'],'Registration fee':['पंजीकरण शुल्क','ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਫੀਸ'],'Your home':['आपका घर','ਤੁਹਾਡਾ ਘਰ'],
 'Your teaching space':['आपकी पढ़ाने की जगह','ਤੁਹਾਡੀ ਪੜ੍ਹਾਉਣ ਦੀ ਥਾਂ'],'Your time':['आपका समय','ਤੁਹਾਡਾ ਸਮਾਂ'],'A schedule that fits':['आपके अनुकूल समय-सारणी','ਤੁਹਾਡੇ ਅਨੁਕੂਲ ਸਮਾਂ-ਸਾਰਣੀ'],
 'Your knowledge':['आपका ज्ञान','ਤੁਹਾਡਾ ਗਿਆਨ'],'A chance to earn':['कमाई का अवसर','ਕਮਾਈ ਦਾ ਮੌਕਾ'],
 'The possibility we believe in':['जिस संभावना में हम विश्वास रखते हैं','ਜਿਸ ਸੰਭਾਵਨਾ ਵਿੱਚ ਅਸੀਂ ਵਿਸ਼ਵਾਸ ਰੱਖਦੇ ਹਾਂ'],
 'Talent lives everywhere. Opportunity should, too.':['प्रतिभा हर जगह है। अवसर भी हर जगह होना चाहिए।','ਪ੍ਰਤਿਭਾ ਹਰ ਥਾਂ ਹੈ। ਮੌਕਾ ਵੀ ਹਰ ਥਾਂ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।'],
 'For many rural women, knowledge is never the barrier. The barrier is distance, travel and the lack of a platform that takes their skills seriously.':['कई ग्रामीण महिलाओं के लिए ज्ञान कभी बाधा नहीं होता। बाधा है दूरी, यात्रा और ऐसे मंच की कमी जो उनके हुनर को गंभीरता से ले।','ਕਈ ਪੇਂਡੂ ਔਰਤਾਂ ਲਈ ਗਿਆਨ ਕਦੇ ਰੁਕਾਵਟ ਨਹੀਂ ਹੁੰਦਾ। ਰੁਕਾਵਟ ਹੈ ਦੂਰੀ, ਸਫ਼ਰ ਅਤੇ ਅਜਿਹੇ ਪਲੇਟਫਾਰਮ ਦੀ ਘਾਟ ਜੋ ਉਨ੍ਹਾਂ ਦੇ ਹੁਨਰ ਨੂੰ ਗੰਭੀਰਤਾ ਨਾਲ ਲਵੇ।'],
 'Modiv’s Social vision opens a path to online teaching. A woman can register, build a tutor profile and meet students without leaving her village.':['मोदिव्स की सामाजिक सोच ऑनलाइन पढ़ाने का रास्ता खोलती है। एक महिला अपने गाँव से बाहर गए बिना रजिस्टर कर सकती है, ट्यूटर प्रोफ़ाइल बना सकती है और विद्यार्थियों से मिल सकती है।','ਮੋਦਿਵਜ਼ ਦੀ ਸਮਾਜਿਕ ਸੋਚ ਆਨਲਾਈਨ ਪੜ੍ਹਾਉਣ ਦਾ ਰਾਹ ਖੋਲ੍ਹਦੀ ਹੈ। ਇੱਕ ਔਰਤ ਆਪਣੇ ਪਿੰਡ ਤੋਂ ਬਾਹਰ ਗਏ ਬਿਨਾਂ ਰਜਿਸਟਰ ਕਰ ਸਕਦੀ ਹੈ, ਟਿਊਟਰ ਪ੍ਰੋਫਾਈਲ ਬਣਾ ਸਕਦੀ ਹੈ ਅਤੇ ਵਿਦਿਆਰਥੀਆਂ ਨੂੰ ਮਿਲ ਸਕਦੀ ਹੈ।'],
 'Rooted in her village. Connected to a world of learners.':['अपने गाँव में जड़ें, सीखने वालों की दुनिया से जुड़ाव।','ਆਪਣੇ ਪਿੰਡ ਵਿੱਚ ਜੜ੍ਹਾਂ, ਸਿੱਖਣ ਵਾਲਿਆਂ ਦੀ ਦੁਨੀਆ ਨਾਲ ਜੁੜਾਅ।'],
 'The Modiv vision':['मोदिव की सोच','ਮੋਦਿਵ ਦੀ ਸੋਚ'],
 'A first step without a registration fee.':['बिना पंजीकरण शुल्क के पहला कदम।','ਬਿਨਾਂ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਫੀਸ ਦੇ ਪਹਿਲਾ ਕਦਮ।'],
 'Registration is free for rural women joining this initiative. Start with what you know and let learners find you.':['इस पहल से जुड़ने वाली ग्रामीण महिलाओं के लिए पंजीकरण मुफ़्त है। जो आप जानती हैं उसी से शुरू करें और सीखने वालों को आप तक आने दें।','ਇਸ ਪਹਿਲ ਨਾਲ ਜੁੜਨ ਵਾਲੀਆਂ ਪੇਂਡੂ ਔਰਤਾਂ ਲਈ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਮੁਫ਼ਤ ਹੈ। ਜੋ ਤੁਸੀਂ ਜਾਣਦੇ ਹੋ ਉਸੇ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਸਿੱਖਣ ਵਾਲਿਆਂ ਨੂੰ ਤੁਹਾਡੇ ਤੱਕ ਆਉਣ ਦਿਓ।'],
 'A small step. A new beginning.':['एक छोटा कदम। एक नई शुरुआत।','ਇੱਕ ਛੋਟਾ ਕਦਮ। ਇੱਕ ਨਵੀਂ ਸ਼ੁਰੂਆਤ।'],
 'From your home to their classroom.':['आपके घर से उनकी कक्षा तक।','ਤੁਹਾਡੇ ਘਰ ਤੋਂ ਉਨ੍ਹਾਂ ਦੀ ਜਮਾਤ ਤੱਕ।'],
 'Start with what you know.':['जो आप जानती हैं, उससे शुरू करें।','ਜੋ ਤੁਸੀਂ ਜਾਣਦੇ ਹੋ, ਉਸ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ।'],
 'Register for free':['मुफ़्त रजिस्टर करें','ਮੁਫ਼ਤ ਰਜਿਸਟਰ ਕਰੋ'],
 'Create your account and tell us about yourself, your village and what you can teach.':['अपना खाता बनाएँ और हमें अपने, अपने गाँव और अपने पढ़ाने के विषयों के बारे में बताएँ।','ਆਪਣਾ ਖਾਤਾ ਬਣਾਓ ਅਤੇ ਸਾਨੂੰ ਆਪਣੇ, ਆਪਣੇ ਪਿੰਡ ਅਤੇ ਆਪਣੇ ਪੜ੍ਹਾਉਣ ਦੇ ਵਿਸ਼ਿਆਂ ਬਾਰੇ ਦੱਸੋ।'],
 'Build your tutor profile':['अपनी ट्यूटर प्रोफ़ाइल बनाएँ','ਆਪਣੀ ਟਿਊਟਰ ਪ੍ਰੋਫਾਈਲ ਬਣਾਓ'],
 'Add your subjects, qualifications, preferred fee and the hours that suit you.':['अपने विषय, योग्यता, पसंदीदा फ़ीस और अपने अनुकूल समय जोड़ें।','ਆਪਣੇ ਵਿਸ਼ੇ, ਯੋਗਤਾ, ਪਸੰਦੀਦਾ ਫੀਸ ਅਤੇ ਆਪਣੇ ਅਨੁਕੂਲ ਸਮਾਂ ਜੋੜੋ।'],
 'Connect with learners':['सीखने वालों से जुड़ें','ਸਿੱਖਣ ਵਾਲਿਆਂ ਨਾਲ ਜੁੜੋ'],
 'After your profile is reviewed, explore student requests and respond to the ones that fit.':['आपकी प्रोफ़ाइल की समीक्षा के बाद विद्यार्थियों के अनुरोध देखें और अपने अनुकूल अनुरोधों का जवाब दें।','ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਦੀ ਸਮੀਖਿਆ ਤੋਂ ਬਾਅਦ ਵਿਦਿਆਰਥੀਆਂ ਦੀਆਂ ਬੇਨਤੀਆਂ ਵੇਖੋ ਅਤੇ ਆਪਣੇ ਅਨੁਕੂਲ ਬੇਨਤੀਆਂ ਦਾ ਜਵਾਬ ਦਿਓ।'],
 'Teach online & earn':['ऑनलाइन पढ़ाएँ और कमाएँ','ਆਨਲਾਈਨ ਪੜ੍ਹਾਓ ਅਤੇ ਕਮਾਓ'],
 'Share your knowledge from home and grow your teaching practice at your own pace.':['घर से अपना ज्ञान साझा करें और अपनी गति से अपना शिक्षण कार्य बढ़ाएँ।','ਘਰੋਂ ਆਪਣਾ ਗਿਆਨ ਸਾਂਝਾ ਕਰੋ ਅਤੇ ਆਪਣੀ ਰਫ਼ਤਾਰ ਨਾਲ ਆਪਣਾ ਪੜ੍ਹਾਉਣ ਦਾ ਕੰਮ ਵਧਾਓ।'],
 'More than an online class':['सिर्फ़ एक ऑनलाइन क्लास से बढ़कर','ਸਿਰਫ਼ ਇੱਕ ਆਨਲਾਈਨ ਕਲਾਸ ਤੋਂ ਵੱਧ'],
 'When she teaches,':['जब वह पढ़ाती है,','ਜਦੋਂ ਉਹ ਪੜ੍ਹਾਉਂਦੀ ਹੈ,'],'a new future takes shape.':['एक नया भविष्य आकार लेता है।','ਇੱਕ ਨਵਾਂ ਭਵਿੱਖ ਆਕਾਰ ਲੈਂਦਾ ਹੈ।'],
 'Our vision is to turn the knowledge women already carry into confidence, income and a place in the wider learning community.':['हमारा लक्ष्य है कि महिलाओं के पास पहले से मौजूद ज्ञान आत्मविश्वास, आमदनी और व्यापक सीखने वाले समुदाय में एक जगह बन जाए।','ਸਾਡਾ ਟੀਚਾ ਹੈ ਕਿ ਔਰਤਾਂ ਕੋਲ ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਗਿਆਨ ਆਤਮ-ਵਿਸ਼ਵਾਸ, ਆਮਦਨ ਅਤੇ ਵਿਆਪਕ ਸਿੱਖਣ ਵਾਲੇ ਭਾਈਚਾਰੇ ਵਿੱਚ ਇੱਕ ਥਾਂ ਬਣ ਜਾਵੇ।'],
 'Modiv’s vision is to turn the knowledge women already carry into confidence, income and a place in the wider learning community.':['हमारा लक्ष्य है कि महिलाओं के पास पहले से मौजूद ज्ञान आत्मविश्वास, आमदनी और व्यापक सीखने वाले समुदाय में एक जगह बन जाए।','ਸਾਡਾ ਟੀਚਾ ਹੈ ਕਿ ਔਰਤਾਂ ਕੋਲ ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਗਿਆਨ ਆਤਮ-ਵਿਸ਼ਵਾਸ, ਆਮਦਨ ਅਤੇ ਵਿਆਪਕ ਸਿੱਖਣ ਵਾਲੇ ਭਾਈਚਾਰੇ ਵਿੱਚ ਇੱਕ ਥਾਂ ਬਣ ਜਾਵੇ।'],
 'Income with independence':['आज़ादी के साथ आमदनी','ਆਜ਼ਾਦੀ ਨਾਲ ਆਮਦਨ'],
 'An opportunity to earn from teaching and contribute to your family and community.':['पढ़ाकर कमाने और अपने परिवार व समुदाय में योगदान देने का अवसर।','ਪੜ੍ਹਾ ਕੇ ਕਮਾਉਣ ਅਤੇ ਆਪਣੇ ਪਰਿਵਾਰ ਤੇ ਭਾਈਚਾਰੇ ਵਿੱਚ ਯੋਗਦਾਨ ਪਾਉਣ ਦਾ ਮੌਕਾ।'],
 'Work that stays close to home':['घर के पास रहकर काम','ਘਰ ਦੇ ਨੇੜੇ ਰਹਿ ਕੇ ਕੰਮ'],
 'Reach students online without a daily commute or leaving your village.':['रोज़ की यात्रा या गाँव छोड़े बिना ऑनलाइन विद्यार्थियों तक पहुँचें।','ਰੋਜ਼ ਦੇ ਸਫ਼ਰ ਜਾਂ ਪਿੰਡ ਛੱਡੇ ਬਿਨਾਂ ਆਨਲਾਈਨ ਵਿਦਿਆਰਥੀਆਂ ਤੱਕ ਪਹੁੰਚੋ।'],
 'Confidence that travels further':['आत्मविश्वास जो दूर तक जाता है','ਆਤਮ-ਵਿਸ਼ਵਾਸ ਜੋ ਦੂਰ ਤੱਕ ਜਾਂਦਾ ਹੈ'],
 'Build a professional identity and show the next generation what is possible.':['अपनी पेशेवर पहचान बनाएँ और अगली पीढ़ी को दिखाएँ कि क्या संभव है।','ਆਪਣੀ ਪੇਸ਼ੇਵਰ ਪਛਾਣ ਬਣਾਓ ਅਤੇ ਅਗਲੀ ਪੀੜ੍ਹੀ ਨੂੰ ਦਿਖਾਓ ਕਿ ਕੀ ਸੰਭਵ ਹੈ।'],
 'There is value in what you know':['आप जो जानती हैं उसकी कीमत है','ਜੋ ਤੁਸੀਂ ਜਾਣਦੇ ਹੋ ਉਸਦੀ ਕਦਰ ਹੈ'],
 'What could you teach?':['आप क्या पढ़ा सकती हैं?','ਤੁਸੀਂ ਕੀ ਪੜ੍ਹਾ ਸਕਦੇ ਹੋ?'],
 'Start with your strengths and qualifications.':['अपनी खूबियों और योग्यताओं से शुरू करें।','ਆਪਣੀਆਂ ਖੂਬੀਆਂ ਅਤੇ ਯੋਗਤਾਵਾਂ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ।'],
 'School subjects':['स्कूली विषय','ਸਕੂਲੀ ਵਿਸ਼ੇ'],'Maths, science & more':['गणित, विज्ञान और बहुत कुछ','ਗਣਿਤ, ਵਿਗਿਆਨ ਅਤੇ ਹੋਰ ਬਹੁਤ ਕੁਝ'],
 'Languages':['भाषाएँ','ਭਾਸ਼ਾਵਾਂ'],'Hindi, English & regional languages':['हिंदी, अंग्रेज़ी और क्षेत्रीय भाषाएँ','ਹਿੰਦੀ, ਅੰਗਰੇਜ਼ੀ ਅਤੇ ਖੇਤਰੀ ਭਾਸ਼ਾਵਾਂ'],
 'Art & craft':['कला और शिल्प','ਕਲਾ ਅਤੇ ਸ਼ਿਲਪ'],'Drawing, painting & creative skills':['चित्रकारी, पेंटिंग और रचनात्मक हुनर','ਚਿੱਤਰਕਾਰੀ, ਪੇਂਟਿੰਗ ਅਤੇ ਰਚਨਾਤਮਕ ਹੁਨਰ'],
 'Music & more':['संगीत और बहुत कुछ','ਸੰਗੀਤ ਅਤੇ ਹੋਰ ਬਹੁਤ ਕੁਝ'],'Share your specialist knowledge':['अपना विशेष ज्ञान साझा करें','ਆਪਣਾ ਖਾਸ ਗਿਆਨ ਸਾਂਝਾ ਕਰੋ'],
 'A little clarity to get started':['शुरुआत के लिए थोड़ी स्पष्टता','ਸ਼ੁਰੂਆਤ ਲਈ ਥੋੜ੍ਹੀ ਸਪਸ਼ਟਤਾ'],'Your questions,':['आपके सवाल,','ਤੁਹਾਡੇ ਸਵਾਲ,'],'answered.':['जवाब के साथ।','ਜਵਾਬਾਂ ਸਮੇਤ।'],
 'New to online teaching? You don’t have to figure it out alone.':['ऑनलाइन पढ़ाना आपके लिए नया है? आपको सब कुछ अकेले समझने की ज़रूरत नहीं।','ਆਨਲਾਈਨ ਪੜ੍ਹਾਉਣਾ ਤੁਹਾਡੇ ਲਈ ਨਵਾਂ ਹੈ? ਤੁਹਾਨੂੰ ਸਭ ਕੁਝ ਇਕੱਲਿਆਂ ਸਮਝਣ ਦੀ ਲੋੜ ਨਹੀਂ।'],
 'Talk to the Modiv team ↗':['मोदिव टीम से बात करें ↗','ਮੋਦਿਵ ਟੀਮ ਨਾਲ ਗੱਲ ਕਰੋ ↗'],
 'Is registration really free?':['क्या पंजीकरण सच में मुफ़्त है?','ਕੀ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸੱਚਮੁੱਚ ਮੁਫ਼ਤ ਹੈ?'],
 'Yes. Rural women can register for this initiative without paying a registration fee.':['हाँ। ग्रामीण महिलाएँ इस पहल के लिए बिना कोई पंजीकरण शुल्क दिए रजिस्टर कर सकती हैं।','ਹਾਂ। ਪੇਂਡੂ ਔਰਤਾਂ ਇਸ ਪਹਿਲ ਲਈ ਬਿਨਾਂ ਕੋਈ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਫੀਸ ਦਿੱਤੇ ਰਜਿਸਟਰ ਕਰ ਸਕਦੀਆਂ ਹਨ।'],
 'What do I need to teach online?':['ऑनलाइन पढ़ाने के लिए मुझे क्या चाहिए?','ਆਨਲਾਈਨ ਪੜ੍ਹਾਉਣ ਲਈ ਮੈਨੂੰ ਕੀ ਚਾਹੀਦਾ ਹੈ?'],
 'A smartphone or laptop, an internet connection and a quiet corner at home. Our team can help you get set up.':['एक स्मार्टफ़ोन या लैपटॉप, इंटरनेट कनेक्शन और घर में एक शांत कोना। सेट-अप में हमारी टीम आपकी मदद कर सकती है।','ਇੱਕ ਸਮਾਰਟਫ਼ੋਨ ਜਾਂ ਲੈਪਟਾਪ, ਇੰਟਰਨੈੱਟ ਕਨੈਕਸ਼ਨ ਅਤੇ ਘਰ ਵਿੱਚ ਇੱਕ ਸ਼ਾਂਤ ਕੋਨਾ। ਸੈੱਟ-ਅੱਪ ਵਿੱਚ ਸਾਡੀ ਟੀਮ ਤੁਹਾਡੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹੈ।'],
 'Can I choose my teaching hours?':['क्या मैं अपने पढ़ाने के घंटे खुद चुन सकती हूँ?','ਕੀ ਮੈਂ ਆਪਣੇ ਪੜ੍ਹਾਉਣ ਦੇ ਘੰਟੇ ਆਪ ਚੁਣ ਸਕਦੀ ਹਾਂ?'],
 'Yes. You set the days and times that fit around your home and family.':['हाँ। आप अपने घर और परिवार के अनुसार दिन और समय तय करती हैं।','ਹਾਂ। ਤੁਸੀਂ ਆਪਣੇ ਘਰ ਅਤੇ ਪਰਿਵਾਰ ਮੁਤਾਬਕ ਦਿਨ ਅਤੇ ਸਮਾਂ ਤੈਅ ਕਰਦੇ ਹੋ।'],
 'Is an income guaranteed?':['क्या आमदनी की गारंटी है?','ਕੀ ਆਮਦਨ ਦੀ ਗਾਰੰਟੀ ਹੈ?'],
 'No. You earn from the students you teach, so a complete profile and good teaching help you get more requests.':['नहीं। आपकी कमाई आपके पढ़ाए विद्यार्थियों से होती है, इसलिए पूरी प्रोफ़ाइल और अच्छा शिक्षण ज़्यादा अनुरोध दिलाने में मदद करते हैं।','ਨਹੀਂ। ਤੁਹਾਡੀ ਕਮਾਈ ਤੁਹਾਡੇ ਪੜ੍ਹਾਏ ਵਿਦਿਆਰਥੀਆਂ ਤੋਂ ਹੁੰਦੀ ਹੈ, ਇਸ ਲਈ ਪੂਰੀ ਪ੍ਰੋਫਾਈਲ ਅਤੇ ਚੰਗੀ ਪੜ੍ਹਾਈ ਵੱਧ ਬੇਨਤੀਆਂ ਦਿਵਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰਦੇ ਹਨ।'],
 'Your next chapter':['आपका अगला अध्याय','ਤੁਹਾਡਾ ਅਗਲਾ ਅਧਿਆਇ'],'Your village.':['आपका गाँव।','ਤੁਹਾਡਾ ਪਿੰਡ।'],'Your knowledge.':['आपका ज्ञान।','ਤੁਹਾਡਾ ਗਿਆਨ।'],
 'A world of possibilities.':['संभावनाओं की एक दुनिया।','ਸੰਭਾਵਨਾਵਾਂ ਦੀ ਇੱਕ ਦੁਨੀਆ।'],
 'Take the first step towards teaching online. Registration is free and takes only a few minutes.':['ऑनलाइन पढ़ाने की ओर पहला कदम उठाएँ। पंजीकरण मुफ़्त है और इसमें बस कुछ मिनट लगते हैं।','ਆਨਲਾਈਨ ਪੜ੍ਹਾਉਣ ਵੱਲ ਪਹਿਲਾ ਕਦਮ ਚੁੱਕੋ। ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਮੁਫ਼ਤ ਹੈ ਅਤੇ ਇਸ ਵਿੱਚ ਬੱਸ ਕੁਝ ਮਿੰਟ ਲੱਗਦੇ ਹਨ।'],
 'Registration fee. A possibility worth exploring.':['पंजीकरण शुल्क। एक संभावना, जिसे आज़माना सार्थक है।','ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਫੀਸ। ਇੱਕ ਸੰਭਾਵਨਾ, ਜਿਸਨੂੰ ਅਜ਼ਮਾਉਣਾ ਸਾਰਥਕ ਹੈ।'],
 'Know a woman who could teach? Share this opportunity with her.':['क्या आप किसी ऐसी महिला को जानती हैं जो पढ़ा सकती है? यह अवसर उसके साथ साझा करें।','ਕੀ ਤੁਸੀਂ ਕਿਸੇ ਅਜਿਹੀ ਔਰਤ ਨੂੰ ਜਾਣਦੇ ਹੋ ਜੋ ਪੜ੍ਹਾ ਸਕਦੀ ਹੈ? ਇਹ ਮੌਕਾ ਉਸ ਨਾਲ ਸਾਂਝਾ ਕਰੋ।'],
 'Begin your teaching journey':['अपना शिक्षण सफ़र शुरू करें','ਆਪਣਾ ਪੜ੍ਹਾਉਣ ਦਾ ਸਫ਼ਰ ਸ਼ੁਰੂ ਕਰੋ'],
 'Tell us a little about yourself to get started.':['शुरू करने के लिए अपने बारे में थोड़ा बताएँ।','ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਆਪਣੇ ਬਾਰੇ ਥੋੜ੍ਹਾ ਦੱਸੋ।'],
 'Full name':['पूरा नाम','ਪੂਰਾ ਨਾਮ'],'Enter your name':['अपना नाम लिखें','ਆਪਣਾ ਨਾਮ ਲਿਖੋ'],'Mobile number':['मोबाइल नंबर','ਮੋਬਾਈਲ ਨੰਬਰ'],
 '+91  Mobile number':['+91  मोबाइल नंबर','+91  ਮੋਬਾਈਲ ਨੰਬਰ'],
 'Village / town & state':['गाँव / शहर और राज्य','ਪਿੰਡ / ਸ਼ਹਿਰ ਅਤੇ ਰਾਜ'],'Where do you live?':['आप कहाँ रहती हैं?','ਤੁਸੀਂ ਕਿੱਥੇ ਰਹਿੰਦੇ ਹੋ?'],
 'What can you teach?':['आप क्या पढ़ा सकती हैं?','ਤੁਸੀਂ ਕੀ ਪੜ੍ਹਾ ਸਕਦੇ ਹੋ?'],'Subject or skill':['विषय या हुनर','ਵਿਸ਼ਾ ਜਾਂ ਹੁਨਰ'],
 'By continuing, you agree to Modiv’s':['आगे बढ़ने पर आप मोदिव्स की','ਅੱਗੇ ਵਧਣ \'ਤੇ ਤੁਸੀਂ ਮੋਦਿਵਜ਼ ਦੀਆਂ'],
 'Terms & Conditions':['नियम व शर्तें','ਨਿਯਮ ਅਤੇ ਸ਼ਰਤਾਂ'],'and':['और','ਅਤੇ'],'Privacy Policy':['गोपनीयता नीति','ਗੋਪਨੀਯਤਾ ਨੀਤੀ'],
 '.':[' से सहमत होते हैं।',' ਨਾਲ ਸਹਿਮਤ ਹੁੰਦੇ ਹੋ।'],
 'Need help? Call':['मदद चाहिए? कॉल करें','ਮਦਦ ਚਾਹੀਦੀ ਹੈ? ਕਾਲ ਕਰੋ']
 };
 var L={en:0,hi:1,pa:2},LBL={en:'EN',hi:'हिं',pa:'ਪੰ'},NAME={en:'English',hi:'हिन्दी',pa:'ਪੰਜਾਬੀ'};
 var nodes=null,cur='en',TITLE=document.title;
 function collect(){
  nodes=[];
  [document.querySelector('header.mv-header'),document.querySelector('main')].forEach(function(root){
   if(!root)return;
   var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
    var p=n.parentNode;if(!p||/^(SCRIPT|STYLE|svg|SVG)$/.test(p.nodeName)||p.closest('svg'))return NodeFilter.FILTER_REJECT;
    return n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
   var n;while((n=w.nextNode()))nodes.push({n:n,o:n.nodeValue});
  });
 }
 function apply(l){
  if(!nodes)collect();
  cur=l;document.documentElement.lang=l;
  nodes.forEach(function(x){
   var t=x.o.trim(),lead=x.o.match(/^\s*/)[0],trail=x.o.match(/\s*$/)[0];
   x.n.nodeValue=(l==='en'||!D[t])?x.o:(t==='.'?D[t][L[l]-1]:lead+D[t][L[l]-1]+trail);
  });
  [].forEach.call(document.querySelectorAll('[placeholder]'),function(e){
   if(e.dataset.phEn===undefined)e.dataset.phEn=e.getAttribute('placeholder');
   var en=e.dataset.phEn;e.setAttribute('placeholder',(l==='en'||!D[en])?en:D[en][L[l]-1]);
  });
  [].forEach.call(document.querySelectorAll('.mv-lang button'),function(b){b.setAttribute('aria-pressed',b.dataset.l===l?'true':'false')});
  try{localStorage.setItem('modivs_lang',l)}catch(e){}
 }
 function build(){
  var acts=document.getElementById('mvActs');if(!acts||acts.querySelector('.mv-lang'))return;
  var g=document.createElement('div');g.className='mv-lang';g.setAttribute('role','group');g.setAttribute('aria-label','Language');
  ['en','hi','pa'].forEach(function(k){
   var b=document.createElement('button');b.type='button';b.dataset.l=k;b.textContent=LBL[k];b.title=NAME[k];b.setAttribute('aria-label',NAME[k]);b.setAttribute('aria-pressed',k==='en'?'true':'false');
   b.addEventListener('click',function(){apply(k)});g.appendChild(b);
  });
  acts.insertBefore(g,acts.firstChild);
 }
 function init(){
  if(!document.querySelector('main.sv'))return;
  build();
  var q=/[?&]lang=(en|hi|pa)/.exec(location.search),s=null;try{s=localStorage.getItem('modivs_lang')}catch(e){}
  var l=q?q[1]:(s&&L[s]!==undefined?s:'en');
  if(l!=='en')apply(l);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
