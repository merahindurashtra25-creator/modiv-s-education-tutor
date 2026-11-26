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
 'Need help? Call':['मदद चाहिए? कॉल करें','ਮਦਦ ਚਾਹੀਦੀ ਹੈ? ਕਾਲ ਕਰੋ'],
 "Tuition":["ट्यूशन","ਟਿਊਸ਼ਨ"],
 "₹0 registration fee · Start earning from home · Choose your own hours":["₹0 पंजीकरण शुल्क · घर से कमाई शुरू करें · अपना समय खुद चुनें","₹0 ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਫੀਸ · ਘਰੋਂ ਕਮਾਈ ਸ਼ੁਰੂ ਕਰੋ · ਆਪਣਾ ਸਮਾਂ ਆਪ ਚੁਣੋ"],
 "Where it began":["जहाँ से शुरुआत हुई","ਜਿੱਥੋਂ ਸ਼ੁਰੂਆਤ ਹੋਈ"],
 "Ten years of opening doors for women.":["महिलाओं के लिए दरवाज़े खोलते दस साल।","ਔਰਤਾਂ ਲਈ ਦਰਵਾਜ਼ੇ ਖੋਲ੍ਹਦੇ ਦਸ ਸਾਲ।"],
 "Shri Narendra Modi Ji":["श्री नरेंद्र मोदी जी","ਸ਼੍ਰੀ ਨਰਿੰਦਰ ਮੋਦੀ ਜੀ"],
 "Prime Minister of India":["भारत के प्रधानमंत्री","ਭਾਰਤ ਦੇ ਪ੍ਰਧਾਨ ਮੰਤਰੀ"],
 "years of the mission":["मिशन के वर्ष","ਮਿਸ਼ਨ ਦੇ ਸਾਲ"],
 "Modiv’s Social Vision & Mission":["मोदिव्स की सामाजिक सोच और मिशन","ਮੋਦਿਵਜ਼ ਦੀ ਸਮਾਜਿਕ ਸੋਚ ਅਤੇ ਮਿਸ਼ਨ"],
 "This mission began a decade ago with one belief: a woman’s skills should never be limited by where she lives. Over ten years it has grown into an effort that follows the Viksit Bharat path shown by Shri Narendra Modi Ji, creating employment for women.":["यह मिशन एक दशक पहले एक विश्वास के साथ शुरू हुआ: किसी महिला के हुनर को इस बात से कभी सीमित नहीं होना चाहिए कि वह कहाँ रहती है। दस वर्षों में यह श्री नरेंद्र मोदी जी द्वारा दिखाए गए विकसित भारत के मार्ग पर चलते हुए महिलाओं के लिए रोज़गार बनाने के प्रयास में बदल गया है।","ਇਹ ਮਿਸ਼ਨ ਇੱਕ ਦਹਾਕਾ ਪਹਿਲਾਂ ਇੱਕ ਵਿਸ਼ਵਾਸ ਨਾਲ ਸ਼ੁਰੂ ਹੋਇਆ: ਕਿਸੇ ਔਰਤ ਦੇ ਹੁਨਰ ਨੂੰ ਇਸ ਗੱਲ ਨਾਲ ਕਦੇ ਸੀਮਤ ਨਹੀਂ ਹੋਣਾ ਚਾਹੀਦਾ ਕਿ ਉਹ ਕਿੱਥੇ ਰਹਿੰਦੀ ਹੈ। ਦਸ ਸਾਲਾਂ ਵਿੱਚ ਇਹ ਸ਼੍ਰੀ ਨਰਿੰਦਰ ਮੋਦੀ ਜੀ ਵੱਲੋਂ ਦਿਖਾਏ ਵਿਕਸਿਤ ਭਾਰਤ ਦੇ ਰਾਹ ’ਤੇ ਚੱਲਦਿਆਂ ਔਰਤਾਂ ਲਈ ਰੁਜ਼ਗਾਰ ਪੈਦਾ ਕਰਨ ਦੇ ਯਤਨ ਵਿੱਚ ਬਦਲ ਗਿਆ ਹੈ।"],
 "Today that same vision lets women teach online from home, with free registration.":["आज वही सोच महिलाओं को घर से ऑनलाइन पढ़ाने का अवसर देती है, मुफ़्त पंजीकरण के साथ।","ਅੱਜ ਉਹੀ ਸੋਚ ਔਰਤਾਂ ਨੂੰ ਘਰੋਂ ਆਨਲਾਈਨ ਪੜ੍ਹਾਉਣ ਦਾ ਮੌਕਾ ਦਿੰਦੀ ਹੈ, ਮੁਫ਼ਤ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਨਾਲ।"],
 "Mr. Divyansh Dhiman":["श्री दिव्यांश धीमान","ਸ਼੍ਰੀ ਦਿਵਿਆਂਸ਼ ਧੀਮਾਨ"],
 "Founder, Modiv’s Education":["संस्थापक, मोदिव्स एजुकेशन","ਸੰਸਥਾਪਕ, ਮੋਦਿਵਜ਼ ਐਜੂਕੇਸ਼ਨ"],
 "Why the name “Modiv’s”":["“मोदिव्स” नाम क्यों","“ਮੋਦਿਵਜ਼” ਨਾਮ ਕਿਉਂ"],
 "Our name, Modiv’s, is a tribute to the leadership of Shri Narendra Modi Ji. We walk his path of Atmanirbhar Bharat by helping rural women turn their knowledge into income, with free registration and no village left behind.":["हमारा नाम मोदिव्स श्री नरेंद्र मोदी जी के नेतृत्व को एक श्रद्धांजलि है। हम उनके आत्मनिर्भर भारत के मार्ग पर चलते हैं: ग्रामीण महिलाओं को उनके ज्ञान को आमदनी में बदलने में मदद करके, मुफ़्त पंजीकरण के साथ और किसी भी गाँव को पीछे छोड़े बिना।","ਸਾਡਾ ਨਾਮ ਮੋਦਿਵਜ਼ ਸ਼੍ਰੀ ਨਰਿੰਦਰ ਮੋਦੀ ਜੀ ਦੀ ਅਗਵਾਈ ਨੂੰ ਇੱਕ ਸ਼ਰਧਾਂਜਲੀ ਹੈ। ਅਸੀਂ ਉਨ੍ਹਾਂ ਦੇ ਆਤਮਨਿਰਭਰ ਭਾਰਤ ਦੇ ਰਾਹ ’ਤੇ ਚੱਲਦੇ ਹਾਂ: ਪੇਂਡੂ ਔਰਤਾਂ ਨੂੰ ਉਨ੍ਹਾਂ ਦੇ ਗਿਆਨ ਨੂੰ ਆਮਦਨ ਵਿੱਚ ਬਦਲਣ ਵਿੱਚ ਮਦਦ ਕਰਕੇ, ਮੁਫ਼ਤ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਨਾਲ ਅਤੇ ਕਿਸੇ ਵੀ ਪਿੰਡ ਨੂੰ ਪਿੱਛੇ ਛੱਡੇ ਬਿਨਾਂ।"],
 "The story of the mission":["मिशन की कहानी","ਮਿਸ਼ਨ ਦੀ ਕਹਾਣੀ"],
 "From one belief to thousands of livelihoods.":["एक विश्वास से हज़ारों आजीविकाओं तक।","ਇੱਕ ਵਿਸ਼ਵਾਸ ਤੋਂ ਹਜ਼ਾਰਾਂ ਰੋਜ਼ੀ-ਰੋਟੀਆਂ ਤੱਕ।"],
 "The mission begins":["मिशन की शुरुआत","ਮਿਸ਼ਨ ਦੀ ਸ਼ੁਰੂਆਤ"],
 "A simple belief takes shape: a woman’s skills should never be limited by where she lives.":["एक सरल विश्वास आकार लेता है: किसी महिला के हुनर को इस बात से कभी सीमित नहीं होना चाहिए कि वह कहाँ रहती है।","ਇੱਕ ਸਧਾਰਨ ਵਿਸ਼ਵਾਸ ਆਕਾਰ ਲੈਂਦਾ ਹੈ: ਕਿਸੇ ਔਰਤ ਦੇ ਹੁਨਰ ਨੂੰ ਇਸ ਗੱਲ ਨਾਲ ਕਦੇ ਸੀਮਤ ਨਹੀਂ ਹੋਣਾ ਚਾਹੀਦਾ ਕਿ ਉਹ ਕਿੱਥੇ ਰਹਿੰਦੀ ਹੈ।"],
 "The journey":["यात्रा","ਸਫ਼ਰ"],
 "Walking the Viksit Bharat path":["विकसित भारत के मार्ग पर","ਵਿਕਸਿਤ ਭਾਰਤ ਦੇ ਰਾਹ ’ਤੇ"],
 "Following the path shown by Shri Narendra Modi Ji to open employment opportunities for women.":["महिलाओं के लिए रोज़गार के अवसर खोलने के लिए श्री नरेंद्र मोदी जी द्वारा दिखाए गए मार्ग पर चलते हुए।","ਔਰਤਾਂ ਲਈ ਰੁਜ਼ਗਾਰ ਦੇ ਮੌਕੇ ਖੋਲ੍ਹਣ ਲਈ ਸ਼੍ਰੀ ਨਰਿੰਦਰ ਮੋਦੀ ਜੀ ਵੱਲੋਂ ਦਿਖਾਏ ਰਾਹ ’ਤੇ ਚੱਲਦਿਆਂ।"],
 "On Modiv’s":["मोदिव्स पर","ਮੋਦਿਵਜ਼ ’ਤੇ"],
 "Teaching from home":["घर से पढ़ाना","ਘਰੋਂ ਪੜ੍ਹਾਉਣਾ"],
 "Women register free, become tutors on Modiv’s and teach online from their own homes.":["महिलाएँ मुफ़्त रजिस्टर करती हैं, मोदिव्स पर ट्यूटर बनती हैं और अपने घर से ऑनलाइन पढ़ाती हैं।","ਔਰਤਾਂ ਮੁਫ਼ਤ ਰਜਿਸਟਰ ਕਰਦੀਆਂ ਹਨ, ਮੋਦਿਵਜ਼ ’ਤੇ ਟਿਊਟਰ ਬਣਦੀਆਂ ਹਨ ਅਤੇ ਆਪਣੇ ਘਰੋਂ ਆਨਲਾਈਨ ਪੜ੍ਹਾਉਂਦੀਆਂ ਹਨ।"],
 "Ten years on":["दस साल बाद","ਦਸ ਸਾਲ ਬਾਅਦ"],
 "A decade of work, and thousands of women with a source of income of their own.":["एक दशक का काम, और हज़ारों महिलाएँ जिनके पास आमदनी का अपना स्रोत है।","ਇੱਕ ਦਹਾਕੇ ਦਾ ਕੰਮ, ਅਤੇ ਹਜ਼ਾਰਾਂ ਔਰਤਾਂ ਜਿਨ੍ਹਾਂ ਕੋਲ ਆਮਦਨ ਦਾ ਆਪਣਾ ਸਾਧਨ ਹੈ।"],
 "women have found financial support by becoming tutors on Modiv’s.":["महिलाओं ने मोदिव्स पर ट्यूटर बनकर आर्थिक सहारा पाया है।","ਔਰਤਾਂ ਨੇ ਮੋਦਿਵਜ਼ ’ਤੇ ਟਿਊਟਰ ਬਣ ਕੇ ਆਰਥਿਕ ਸਹਾਰਾ ਪਾਇਆ ਹੈ।"],
 "Join them, register free ↗":["उनसे जुड़ें, मुफ़्त रजिस्टर करें ↗","ਉਨ੍ਹਾਂ ਨਾਲ ਜੁੜੋ, ਮੁਫ਼ਤ ਰਜਿਸਟਰ ਕਰੋ ↗"],
 "Teach more learners at once":["एक साथ ज़्यादा विद्यार्थियों को पढ़ाएँ","ਇੱਕ ਵਾਰ ਵਿੱਚ ਵੱਧ ਵਿਦਿਆਰਥੀਆਂ ਨੂੰ ਪੜ੍ਹਾਓ"],
 "Group tuitions,":["ग्रुप ट्यूशन,","ਗਰੁੱਪ ਟਿਊਸ਼ਨ,"],
 "from your own home.":["अपने ही घर से।","ਆਪਣੇ ਹੀ ਘਰੋਂ।"],
 "Small batches. Bigger reach.":["छोटे बैच। बड़ी पहुँच।","ਛੋਟੇ ਬੈਚ। ਵੱਡੀ ਪਹੁੰਚ।"],
 "Alongside 1-on-1 classes, tutors on Modiv’s can also take group tuitions: one online class, a small batch of students learning together. Families pay less per student, and you can reach more learners in the same hour.":["1-ऑन-1 कक्षाओं के साथ-साथ मोदिव्स के ट्यूटर ग्रुप ट्यूशन भी ले सकते हैं: एक ऑनलाइन कक्षा, जिसमें विद्यार्थियों का एक छोटा बैच साथ सीखता है। परिवारों को प्रति विद्यार्थी कम फ़ीस देनी पड़ती है, और आप उसी घंटे में ज़्यादा सीखने वालों तक पहुँच सकती हैं।","1-ਆਨ-1 ਕਲਾਸਾਂ ਦੇ ਨਾਲ-ਨਾਲ ਮੋਦਿਵਜ਼ ਦੇ ਟਿਊਟਰ ਗਰੁੱਪ ਟਿਊਸ਼ਨ ਵੀ ਲੈ ਸਕਦੇ ਹਨ: ਇੱਕ ਆਨਲਾਈਨ ਕਲਾਸ, ਜਿਸ ਵਿੱਚ ਵਿਦਿਆਰਥੀਆਂ ਦਾ ਇੱਕ ਛੋਟਾ ਬੈਚ ਇਕੱਠੇ ਸਿੱਖਦਾ ਹੈ। ਪਰਿਵਾਰਾਂ ਨੂੰ ਪ੍ਰਤੀ ਵਿਦਿਆਰਥੀ ਘੱਟ ਫੀਸ ਦੇਣੀ ਪੈਂਦੀ ਹੈ, ਅਤੇ ਤੁਸੀਂ ਉਸੇ ਘੰਟੇ ਵਿੱਚ ਵੱਧ ਸਿੱਖਣ ਵਾਲਿਆਂ ਤੱਕ ਪਹੁੰਚ ਸਕਦੇ ਹੋ।"],
 "Small batches":["छोटे बैच","ਛੋਟੇ ਬੈਚ"],
 "Choose the largest batch you are comfortable teaching, from 4 students up to 10–12.":["वह सबसे बड़ा बैच चुनें जिसे पढ़ाने में आप सहज हों, 4 विद्यार्थियों से लेकर 10–12 तक।","ਉਹ ਸਭ ਤੋਂ ਵੱਡਾ ਬੈਚ ਚੁਣੋ ਜਿਸਨੂੰ ਪੜ੍ਹਾਉਣ ਵਿੱਚ ਤੁਸੀਂ ਸਹਿਜ ਹੋਵੋ, 4 ਵਿਦਿਆਰਥੀਆਂ ਤੋਂ ਲੈ ਕੇ 10–12 ਤੱਕ।"],
 "Learn together":["साथ सीखें","ਇਕੱਠੇ ਸਿੱਖੋ"],
 "Students of a similar class and subject study side by side, ask questions and learn from each other.":["एक जैसी कक्षा और विषय के विद्यार्थी साथ बैठकर पढ़ते हैं, सवाल पूछते हैं और एक-दूसरे से सीखते हैं।","ਇੱਕੋ ਜਿਹੀ ਜਮਾਤ ਅਤੇ ਵਿਸ਼ੇ ਦੇ ਵਿਦਿਆਰਥੀ ਇਕੱਠੇ ਪੜ੍ਹਦੇ ਹਨ, ਸਵਾਲ ਪੁੱਛਦੇ ਹਨ ਅਤੇ ਇੱਕ-ਦੂਜੇ ਤੋਂ ਸਿੱਖਦੇ ਹਨ।"],
 "Affordable for families":["परिवारों के लिए किफ़ायती","ਪਰਿਵਾਰਾਂ ਲਈ ਕਿਫ਼ਾਇਤੀ"],
 "Small groups cost less per student than 1-on-1 classes, so more families can say yes.":["छोटे समूहों की फ़ीस प्रति विद्यार्थी 1-ऑन-1 कक्षाओं से कम होती है, इसलिए ज़्यादा परिवार हाँ कह पाते हैं।","ਛੋਟੇ ਸਮੂਹਾਂ ਦੀ ਫੀਸ ਪ੍ਰਤੀ ਵਿਦਿਆਰਥੀ 1-ਆਨ-1 ਕਲਾਸਾਂ ਤੋਂ ਘੱਟ ਹੁੰਦੀ ਹੈ, ਇਸ ਲਈ ਵੱਧ ਪਰਿਵਾਰ ਹਾਂ ਕਹਿ ਪਾਉਂਦੇ ਹਨ।"],
 "Your own timings":["आपका अपना समय","ਤੁਹਾਡਾ ਆਪਣਾ ਸਮਾਂ"],
 "Set the days and hours that suit your home and family, then teach your batch online.":["अपने घर और परिवार के अनुसार दिन और घंटे तय करें, फिर अपने बैच को ऑनलाइन पढ़ाएँ।","ਆਪਣੇ ਘਰ ਅਤੇ ਪਰਿਵਾਰ ਮੁਤਾਬਕ ਦਿਨ ਅਤੇ ਘੰਟੇ ਤੈਅ ਕਰੋ, ਫਿਰ ਆਪਣੇ ਬੈਚ ਨੂੰ ਆਨਲਾਈਨ ਪੜ੍ਹਾਓ।"],
 "Add “Group tuition (Small batches)” when you create your tutor profile.":["अपनी ट्यूटर प्रोफ़ाइल बनाते समय “ग्रुप ट्यूशन (छोटे बैच)” जोड़ें।","ਆਪਣੀ ਟਿਊਟਰ ਪ੍ਰੋਫਾਈਲ ਬਣਾਉਂਦੇ ਸਮੇਂ “ਗਰੁੱਪ ਟਿਊਸ਼ਨ (ਛੋਟੇ ਬੈਚ)” ਜੋੜੋ।"],
 "Register for free ↗":["मुफ़्त रजिस्टर करें ↗","ਮੁਫ਼ਤ ਰਜਿਸਟਰ ਕਰੋ ↗"],
 "Earn from home":["घर से कमाएँ","ਘਰੋਂ ਕਮਾਓ"],
 "Start earning from":["उससे कमाई शुरू करें","ਉਸ ਤੋਂ ਕਮਾਈ ਸ਼ੁਰੂ ਕਰੋ"],
 "what you already know.":["जो आप पहले से जानती हैं।","ਜੋ ਤੁਸੀਂ ਪਹਿਲਾਂ ਤੋਂ ਜਾਣਦੇ ਹੋ।"],
 "You don’t need an office, a commute or a big investment. With a free registration and a tutor profile, your knowledge can become a source of income, right from your village.":["आपको दफ़्तर, रोज़ की यात्रा या बड़े निवेश की ज़रूरत नहीं। मुफ़्त पंजीकरण और एक ट्यूटर प्रोफ़ाइल के साथ आपका ज्ञान आमदनी का स्रोत बन सकता है, सीधे आपके गाँव से।","ਤੁਹਾਨੂੰ ਦਫ਼ਤਰ, ਰੋਜ਼ ਦੇ ਸਫ਼ਰ ਜਾਂ ਵੱਡੇ ਨਿਵੇਸ਼ ਦੀ ਲੋੜ ਨਹੀਂ। ਮੁਫ਼ਤ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਅਤੇ ਇੱਕ ਟਿਊਟਰ ਪ੍ਰੋਫਾਈਲ ਨਾਲ ਤੁਹਾਡਾ ਗਿਆਨ ਆਮਦਨ ਦਾ ਸਾਧਨ ਬਣ ਸਕਦਾ ਹੈ, ਸਿੱਧਾ ਤੁਹਾਡੇ ਪਿੰਡ ਤੋਂ।"],
 "Start earning, register free →":["कमाई शुरू करें, मुफ़्त रजिस्टर करें →","ਕਮਾਈ ਸ਼ੁਰੂ ਕਰੋ, ਮੁਫ਼ਤ ਰਜਿਸਟਰ ਕਰੋ →"],
 "Earnings depend on the students you teach. Not guaranteed.":["कमाई आपके पढ़ाए विद्यार्थियों पर निर्भर करती है। गारंटी नहीं।","ਕਮਾਈ ਤੁਹਾਡੇ ਪੜ੍ਹਾਏ ਵਿਦਿਆਰਥੀਆਂ ’ਤੇ ਨਿਰਭਰ ਕਰਦੀ ਹੈ। ਗਾਰੰਟੀ ਨਹੀਂ।"],
 "₹0 registration. Create your account in a few minutes.":["₹0 पंजीकरण। कुछ ही मिनटों में अपना खाता बनाएँ।","₹0 ਰਜਿਸਟ੍ਰੇਸ਼ਨ। ਕੁਝ ਹੀ ਮਿੰਟਾਂ ਵਿੱਚ ਆਪਣਾ ਖਾਤਾ ਬਣਾਓ।"],
 "Set your own fee":["अपनी फ़ीस खुद तय करें","ਆਪਣੀ ਫੀਸ ਆਪ ਤੈਅ ਕਰੋ"],
 "Add the fee you prefer for 1-on-1 classes or small groups.":["1-ऑन-1 कक्षाओं या छोटे समूहों के लिए अपनी पसंदीदा फ़ीस जोड़ें।","1-ਆਨ-1 ਕਲਾਸਾਂ ਜਾਂ ਛੋਟੇ ਸਮੂਹਾਂ ਲਈ ਆਪਣੀ ਪਸੰਦੀਦਾ ਫੀਸ ਜੋੜੋ।"],
 "Teach online":["ऑनलाइन पढ़ाएँ","ਆਨਲਾਈਨ ਪੜ੍ਹਾਓ"],
 "Take classes from home, at the hours that suit your family.":["घर से कक्षाएँ लें, अपने परिवार के अनुकूल समय पर।","ਘਰੋਂ ਕਲਾਸਾਂ ਲਓ, ਆਪਣੇ ਪਰਿਵਾਰ ਦੇ ਅਨੁਕੂਲ ਸਮੇਂ ’ਤੇ।"],
 "Earn and grow":["कमाएँ और आगे बढ़ें","ਕਮਾਓ ਅਤੇ ਅੱਗੇ ਵਧੋ"],
 "Good teaching and a complete profile bring more student requests.":["अच्छा शिक्षण और पूरी प्रोफ़ाइल से विद्यार्थियों के ज़्यादा अनुरोध मिलते हैं।","ਚੰਗੀ ਪੜ੍ਹਾਈ ਅਤੇ ਪੂਰੀ ਪ੍ਰੋਫਾਈਲ ਨਾਲ ਵਿਦਿਆਰਥੀਆਂ ਦੀਆਂ ਵੱਧ ਬੇਨਤੀਆਂ ਮਿਲਦੀਆਂ ਹਨ।"],
 "Can I teach more than one student at a time?":["क्या मैं एक समय में एक से ज़्यादा विद्यार्थियों को पढ़ा सकती हूँ?","ਕੀ ਮੈਂ ਇੱਕ ਸਮੇਂ ਇੱਕ ਤੋਂ ਵੱਧ ਵਿਦਿਆਰਥੀਆਂ ਨੂੰ ਪੜ੍ਹਾ ਸਕਦੀ ਹਾਂ?"],
 "Yes. You can offer group tuitions in small batches, choosing the batch size you are comfortable with, as well as 1-on-1 classes.":["हाँ। आप 1-ऑन-1 कक्षाओं के साथ-साथ अपनी सुविधा के अनुसार बैच का आकार चुनकर छोटे बैचों में ग्रुप ट्यूशन दे सकती हैं।","ਹਾਂ। ਤੁਸੀਂ 1-ਆਨ-1 ਕਲਾਸਾਂ ਦੇ ਨਾਲ-ਨਾਲ ਆਪਣੀ ਸੁਵਿਧਾ ਮੁਤਾਬਕ ਬੈਚ ਦਾ ਆਕਾਰ ਚੁਣ ਕੇ ਛੋਟੇ ਬੈਚਾਂ ਵਿੱਚ ਗਰੁੱਪ ਟਿਊਸ਼ਨ ਦੇ ਸਕਦੇ ਹੋ।"]
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
   var t=x.o.trim().replace(/\s+/g,' '),lead=x.o.match(/^\s*/)[0],trail=x.o.match(/\s*$/)[0];
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
