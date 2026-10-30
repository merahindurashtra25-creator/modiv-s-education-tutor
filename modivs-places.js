/* Modiv's shared city + area/locality dropdowns.
   - ModivsPlaces.cities(): all cities (list below plus cities of approved tutors)
   - ModivsPlaces.areas(city): localities for that city (list below plus areas of approved tutors)
   - ModivsPlaces.fieldHTML({id,kind:'city'|'area',val,city,areaId}): a dropdown for forms built with innerHTML.
     It keeps a hidden text input with the original id, so existing code that reads the field's value keeps working.
   - ModivsPlaces.upgrade(cityInputId,areaInputId): turns existing text inputs on a page into the same dropdowns.
   "Other (not listed)" is the only way to reach a text box, for a city or locality that is not in the list. */
(function(){
 function seq(p,a,b,skip){var o=[];for(var i=a;i<=b;i++){if(!skip||skip.indexOf(i)<0)o.push(p+' '+i)}return o}
 function L(s){return s.split(',').map(function(x){return x.trim()}).filter(Boolean)}
 var D={
  'Chandigarh':seq('Sector',1,63,[13]).concat(L('Mani Majra,Industrial Area Phase 1,Industrial Area Phase 2,Dhanas,Daria,Maloya,Burail,Hallomajra,Palsora,Raipur Kalan,Attawa,Behlana,Kajheri,Sarangpur,Khuda Ali Sher,Dadu Majra,Kishangarh,Mauli Jagran,Ram Darbar')),
  'Mohali':seq('Phase',1,11).concat(L('Phase 3A,Phase 3B1,Phase 3B2,Phase 4,Phase 5,Phase 6,Phase 7,Phase 8B,Sector 66,Sector 67,Sector 68,Sector 69,Sector 70,Sector 71,Sector 74,Sector 75,Sector 76,Sector 77,Sector 78,Sector 79,Sector 80,Sector 82,Sector 91,Sector 105,Sector 110,Sector 125,Sector 126,Sector 127,Sunny Enclave,Aerocity,Balongi,Mataur,Kumbra,Landran,Sohana,Chappar Chiri,Mullanpur')),
  'Panchkula':seq('Sector',1,28).concat(L('MDC,Industrial Area Phase 1,Industrial Area Phase 2,Pinjore,Kalka,Raipur Rani,Barwala')),
  'Zirakpur':L('VIP Road,Baltana,Dhakoli,Bhabat,Peer Muchalla,Lohgarh,Gazipur,Singhpura,Chandigarh-Ambala Highway,Patiala Road'),
  'Kharar':L('Sunny Enclave,Gillco Valley,Kharar-Landran Road,Kharar-Mohali Road,Sector 115,Sector 125,Sector 126,Sector 127,Greater Mohali'),
  'Dera Bassi':L('Dera Bassi Industrial Area,Mubarikpur,Bhankharpur,Lalru,Jawaharpur'),
  'Ludhiana':L('Model Town,Sarabha Nagar,BRS Nagar,Pakhowal Road,Civil Lines,Dugri,Urban Estate Dugri,Ferozepur Road,Rajguru Nagar,Haibowal,Ghumar Mandi,Chandigarh Road,Shastri Nagar,Kitchlu Nagar,Jamalpur,Tajpur Road,Focal Point,Gill Road,Sunet,Salem Tabri,Janta Nagar,Rishi Nagar,Aggar Nagar,Durga Puri,Barewal Road,Hambran Road,Basant Avenue,Samrala Chowk,Bharat Nagar Chowk,Dholewal,BCM Nagar,Sidhwan Canal Road,Mall Road,Field Ganj,Bhai Randhir Singh Nagar,Kidwai Nagar,Daresi,Giaspura,Sherpur,Ayali,Lohara,Millerganj,Cooper Road,Punjab Agricultural University,Ishar Nagar,Model Gram,Sunder Nagar,Moti Nagar,Guru Nanak Pura,Shivpuri'),
  'Jalandhar':L('Model Town,Adarsh Nagar,Civil Lines,Basti Sheikh,Basti Danishmandan,Basti Bawa Khel,Urban Estate Phase 1,Urban Estate Phase 2,Ladowali Road,Nakodar Road,GT Road,Kapurthala Road,Rama Mandi,Lajpat Nagar,Guru Teg Bahadur Nagar,Jyoti Nagar,New Jawahar Nagar,Gopal Nagar,Preet Nagar,Mithapur,Bhargo Camp,Dilbagh Nagar,Kala Sanghian Road,Maqsudan,Nehru Garden Road,Jalandhar Cantt,Dada Colony,Kishanpura,Model House,Shastri Nagar,Surya Enclave,Garha Road,Tanda Road'),
  'Amritsar':L('Ranjit Avenue,Lawrence Road,Green Avenue,Majitha Road,Mall Road,Civil Lines,Court Road,Basant Avenue,Model Town,Putlighar,White Avenue,Hall Bazaar,GT Road,Chheharta,Tarn Taran Road,Batala Road,Verka,Fatehgarh Churian Road,Albert Road,New Amritsar,Maqbool Road,Sultanwind Road,Rani Ka Bagh,Katra Jaimal Singh,Islamabad,Kot Khalsa,Gumtala,Sant Avenue,Guru Nanak Dev University Road'),
  'Patiala':L('Leela Bhawan,Urban Estate Phase 1,Urban Estate Phase 2,Tripuri,Bhupindra Road,Rajpura Road,Model Town,Sirhind Road,Sanauri Adda,Adalat Bazaar,New Officers Colony,Passi Road,Lahori Gate,Sheran Wala Gate,Gurbax Colony,Ranjit Nagar,Jujhar Nagar,Baba Deep Singh Nagar,Nabha Road,Sunam Road,Bhadson Road'),
  'Bathinda':L('Model Town Phase 1,Model Town Phase 2,Model Town Phase 3,Ajit Road,Mall Road,Power House Road,Civil Lines,Bibiwala Road,Dabwali Road,Goniana Road,Ganesha Basti,Partap Nagar,Canal Colony,Housing Board Colony,Ram Nagar,Sirki Bazaar,Bathinda Cantt,Guru Kashi Nagar,Bhucho Mandi'),
  'Ambala':L('Ambala Cantt,Ambala City,Model Town,Baldev Nagar,Mahesh Nagar,Jagadhri Road'),
  'Hoshiarpur':[],'Moga':[],'Khanna':[],'Phagwara':[],'Pathankot':[],'Sangrur':[],'Ferozepur':[],'Kapurthala':[],'Rajpura':[],'Barnala':[],'Abohar':[],'Malerkotla':[],'Mansa':[],'Fazilka':[],'Sirhind':[],'Nabha':[],'Rupnagar':[],'Gobindgarh':[],'Batala':[],'Gurdaspur':[],'Faridkot':[],'Muktsar':[],
  'Delhi':L('Dwarka,Rohini,Saket,Janakpuri,Pitampura,Lajpat Nagar,Karol Bagh,Vasant Kunj,Vasant Vihar,Mayur Vihar,Preet Vihar,Laxmi Nagar,Shahdara,Model Town,Mukherjee Nagar,Kamla Nagar,Rajouri Garden,Punjabi Bagh,Paschim Vihar,Vikaspuri,Uttam Nagar,Tilak Nagar,Hari Nagar,Greater Kailash,Hauz Khas,Green Park,Malviya Nagar,Defence Colony,South Extension,Nehru Place,Kalkaji,Okhla,Jasola,Sarita Vihar,Connaught Place,Chanakyapuri,Patel Nagar,Kirti Nagar,Moti Nagar,Narela,Burari,Shalimar Bagh,Ashok Vihar,Jahangirpuri,Dilshad Garden,Vivek Vihar,Patparganj,Najafgarh,Palam,Mehrauli,Chhatarpur'),
  'Gurugram':L('DLF Phase 1,DLF Phase 2,DLF Phase 3,DLF Phase 4,DLF Phase 5,Sushant Lok 1,Sushant Lok 2,Sushant Lok 3,Sector 14,Sector 15,Sector 17,Sector 21,Sector 22,Sector 31,Sector 40,Sector 43,Sector 45,Sector 46,Sector 47,Sector 49,Sector 50,Sector 51,Sector 52,Sector 54,Sector 56,Sector 57,Golf Course Road,MG Road,Sohna Road,Palam Vihar,South City 1,South City 2,Nirvana Country,Udyog Vihar,Manesar,Badshahpur,New Gurgaon'),
  'Noida':L('Sector 1,Sector 12,Sector 15,Sector 16,Sector 18,Sector 19,Sector 20,Sector 21,Sector 22,Sector 25,Sector 26,Sector 27,Sector 29,Sector 30,Sector 31,Sector 33,Sector 34,Sector 37,Sector 41,Sector 44,Sector 50,Sector 51,Sector 61,Sector 62,Sector 63,Sector 71,Sector 75,Sector 76,Sector 78,Sector 93,Sector 100,Sector 110,Sector 119,Sector 120,Sector 121,Sector 128,Sector 137,Sector 143,Sector 150,Greater Noida,Noida Extension'),
  'Ghaziabad':L('Indirapuram,Vaishali,Vasundhara,Kaushambi,Raj Nagar,Raj Nagar Extension,Crossings Republik,Siddharth Vihar,Shastri Nagar,Kavi Nagar,Sahibabad,Loni,Nehru Nagar,Govindpuram,Mohan Nagar'),
  'Faridabad':L('Sector 15,Sector 16,Sector 17,Sector 21,Sector 28,Sector 29,Sector 31,Sector 37,Sector 46,Sector 48,Sector 49,Sector 81,NIT,Old Faridabad,Ballabgarh,Greater Faridabad,Neharpar,Surajkund'),
  'Mumbai':L('Andheri East,Andheri West,Bandra,Juhu,Powai,Borivali,Kandivali,Malad,Goregaon,Dahisar,Mulund,Ghatkopar,Chembur,Dadar,Worli,Colaba,Lower Parel,Vikhroli,Kurla,Santacruz,Vile Parle,Thane,Navi Mumbai,Vashi,Mira Road,Bhandup,Sion,Matunga,Byculla,Mahim,Versova,Wadala'),
  'Bengaluru':L('Koramangala,Indiranagar,Whitefield,HSR Layout,Jayanagar,JP Nagar,BTM Layout,Electronic City,Marathahalli,Yelahanka,Malleshwaram,Rajajinagar,Hebbal,Banashankari,Basavanagudi,Bellandur,Sarjapur Road,Bannerghatta Road,Kalyan Nagar,HBR Layout,RT Nagar,Vijayanagar,Yeshwanthpur,Kengeri,Domlur,MG Road,Frazer Town'),
  'Hyderabad':L('Banjara Hills,Jubilee Hills,Gachibowli,Madhapur,Hitech City,Kondapur,Kukatpally,Secunderabad,Begumpet,Ameerpet,Dilsukhnagar,LB Nagar,Miyapur,Manikonda,Uppal,Mehdipatnam,Tolichowki,Somajiguda,Attapur,Nizampet,Kompally,Alwal,Sainikpuri,Tarnaka,Himayatnagar,Abids'),
  'Chennai':L('Anna Nagar,T Nagar,Adyar,Velachery,Tambaram,Porur,Mylapore,Besant Nagar,Nungambakkam,Kilpauk,Guindy,OMR,Perungudi,Sholinganallur,Chromepet,Ambattur,Avadi,Egmore,Kodambakkam,Vadapalani,Mogappair,Perambur,Thiruvanmiyur,Medavakkam'),
  'Kolkata':L('Salt Lake,New Town,Park Street,Ballygunge,Behala,Dum Dum,Howrah,Jadavpur,Garia,Tollygunge,Gariahat,Lake Town,Baguiati,Barasat,Kasba,Alipore,Bhowanipore,Shyambazar,Rajarhat,Santoshpur,Beliaghata,Dhakuria'),
  'Pune':L('Kothrud,Viman Nagar,Hinjewadi,Baner,Aundh,Wakad,Hadapsar,Kharadi,Shivaji Nagar,Deccan,Pimple Saudagar,Pimpri,Chinchwad,Katraj,Warje,Karve Nagar,Magarpatta,Koregaon Park,Camp,Bibwewadi,Sinhagad Road,Nigdi,Balewadi,Wanowrie,Kondhwa,Yerwada'),
  'Jaipur':L('Malviya Nagar,Vaishali Nagar,Mansarovar,C-Scheme,Jagatpura,Tonk Road,Raja Park,Bani Park,Sodala,Civil Lines,Gopalpura,Jhotwara,Sanganer,Pratap Nagar,Vidhyadhar Nagar,Shyam Nagar,Lal Kothi,Sirsi Road,Ajmer Road,Murlipura,Barkat Nagar'),
  'Lucknow':L('Gomti Nagar,Hazratganj,Aliganj,Indira Nagar,Mahanagar,Rajajipuram,Alambagh,Aminabad,Jankipuram,Chinhat,Vikas Nagar,Kapoorthala,Ashiyana,Sushant Golf City,Telibagh,Charbagh,Vibhuti Khand,Faizabad Road,Krishna Nagar'),
  'Dehradun':L('Rajpur Road,Race Course,Clock Tower,Ballupur,Dalanwala,Vasant Vihar,Patel Nagar,Prem Nagar,Sahastradhara Road,Ajabpur,Clement Town,Mussoorie Road,Karanpur,Niranjanpur,ISBT,Raipur,Jakhan,Nehru Colony'),
  'Shimla':L('The Mall,Sanjauli,Chotta Shimla,Totu,Dhalli,Boileauganj,Kasumpti,Summer Hill,Lakkar Bazaar,New Shimla,Lower Bazaar,Khalini,Tutikandi,Panthaghati'),
  'Indore':L('Vijay Nagar,Palasia,Rajwada,Bhawarkua,Saket,Sudama Nagar,Scheme 54,Scheme 78,Scheme 140,Mahalaxmi Nagar,AB Road,Rau,Annapurna,Bengali Square,Nipania,South Tukoganj,Geeta Bhawan,Sapna Sangeeta'),
  'Ahmedabad':L('Navrangpura,Satellite,Bodakdev,Vastrapur,Thaltej,Maninagar,Naranpura,Ghatlodia,Paldi,Prahlad Nagar,SG Highway,Bopal,Gota,Chandkheda,Memnagar,Ambawadi,CG Road,Ellisbridge,Vastral,Naroda,Nikol,Sabarmati,Isanpur'),
  'Bhopal':L('MP Nagar,Arera Colony,Kolar Road,Shahpura,Bairagarh,Habibganj,New Market,Hoshangabad Road,Piplani,Ayodhya Bypass,Govindpura,Awadhpuri,Katara Hills,Bawadiya Kalan,Misrod,Jahangirabad,TT Nagar,Berasia Road,Ashoka Garden'),
  'Patna':L('Boring Road,Kankarbagh,Rajendra Nagar,Patliputra Colony,Bailey Road,Danapur,Kurji,Ashok Rajpath,Gardanibagh,Rajiv Nagar,Anisabad,Saguna More,Phulwari Sharif,Ashiana Nagar,Kidwaipuri,Digha,Khagaul'),
  'Ranchi':L('Lalpur,Harmu,Kanke Road,Morabadi,Bariatu,Doranda,Ashok Nagar,Argora,Dhurwa,Hinoo,Kadru,Booty Road,Main Road,Namkum,Tupudana,Ratu Road'),
  'Kanpur':L('Swaroop Nagar,Kakadeo,Civil Lines,Kidwai Nagar,Arya Nagar,Govind Nagar,Barra,Kalyanpur,Shyam Nagar,Panki,Vikas Nagar,Juhi,Nawabganj,Harsh Nagar'),
  'Nagpur':L('Dharampeth,Sitabuldi,Manish Nagar,Sadar,Civil Lines,Wardha Road,Pratap Nagar,Laxmi Nagar,Bajaj Nagar,Trimurti Nagar'),
  'Surat':L('Adajan,Vesu,Varachha,Athwa,Piplod,Katargam,Pal,Udhna,Citylight,Rander'),
  'Vadodara':L('Alkapuri,Fatehgunj,Manjalpur,Gotri,Akota,Karelibaug,Vasna Road,Subhanpura'),
  'Jammu':L('Gandhi Nagar,Trikuta Nagar,Channi Himmat,Nagrota,Rehari,Sainik Colony,Gangyal,Bantalab'),
  'Srinagar':L('Lal Chowk,Rajbagh,Jawahar Nagar,Hyderpora,Bemina,Nowgam,Dalgate'),
  'Guwahati':L('Dispur,Beltola,Ulubari,Paltan Bazaar,Zoo Road,Six Mile,Maligaon,Chandmari,Ganeshguri,Khanapara'),
  'Bhubaneswar':L('Saheed Nagar,Patia,Nayapalli,Chandrasekharpur,Jayadev Vihar,Khandagiri,Old Town'),
  'Raipur':L('Shankar Nagar,Pandri,Telibandha,Devendra Nagar,Avanti Vihar,Tatibandh'),
  'Kochi':L('Edappally,Kakkanad,Marine Drive,Fort Kochi,Aluva,Palarivattom,Vyttila,Tripunithura,Kaloor,Thevara'),
  'Thiruvananthapuram':L('Pattom,Kowdiar,Vazhuthacaud,Technopark,Kazhakkoottam,Thampanoor,Nemom,Sasthamangalam,Peroorkada'),
  'Coimbatore':L('RS Puram,Gandhipuram,Peelamedu,Saibaba Colony,Singanallur,Race Course,Vadavalli,Ganapathy,Saravanampatti,Podanur'),
  'Visakhapatnam':L('MVP Colony,Madhurawada,Gajuwaka,Dwaraka Nagar,Seethammadhara,Rushikonda,Siripuram,Maharanipeta,Pendurthi'),
  'Agra':L('Sanjay Place,Kamla Nagar,Sikandra,Taj Ganj,Dayalbagh,Shahganj'),
  'Varanasi':L('Lanka,Sigra,Godowlia,Bhelupur,Sarnath,Assi,Cantt'),
  'Prayagraj':L('Civil Lines,George Town,Allenganj,Katra,Naini'),
  'Meerut':L('Shastri Nagar,Model Town,Abu Lane,Kanker Khera,Pallavpuram'),
  'Udaipur':L('Hiran Magri,Fatehpura,Sukher,Pratap Nagar,Bhupalpura'),
  'Jodhpur':L('Shastri Nagar,Sardarpura,Paota,Ratanada,Basni,Chopasni Housing Board'),
  'Kota':L('Talwandi,Vigyan Nagar,Mahaveer Nagar,Dadabari,Rajiv Gandhi Nagar'),
  'Haridwar':[],'Rishikesh':[],'Gwalior':[],'Jabalpur':[],'Madurai':[],'Mysuru':[],'Mangaluru':[],'Nashik':[],'Aurangabad':[],'Rajkot':[],'Ajmer':[],'Bikaner':[],'Gorakhpur':[],'Aligarh':[],'Bareilly':[],'Moradabad':[],'Jamshedpur':[],'Dhanbad':[],'Siliguri':[],'Cuttack':[],'Vijayawada':[],'Tiruchirappalli':[],'Goa':[]
 };
 var COL=(typeof Intl!=='undefined'&&Intl.Collator)?new Intl.Collator('en',{numeric:true,sensitivity:'base'}):null;
 function nat(a,b){return COL?COL.compare(a,b):(a<b?-1:a>b?1:0)}
 function tc(c){return String(c||'').replace(/\s+/g,' ').trim().toLowerCase().replace(/(^|[\s-])([a-z])/g,function(m,a,b){return a+b.toUpperCase()})}
 function lc(s){return String(s||'').trim().toLowerCase()}
 function customs(){
  var out=[];
  ['modivs_tutors_db','modivs_submitted_tutors'].forEach(function(k){try{(JSON.parse(localStorage.getItem(k)||'[]')||[]).forEach(function(t){if(t&&t.status==='approved'&&!t.is_demo&&t.city)out.push(t)})}catch(e){}});
  return out;
 }
 function key(city){var c=lc(city);if(c==='delhi ncr'||c==='new delhi')c='delhi';if(c==='gurgaon')c='gurugram';if(c==='bangalore')c='bengaluru';if(c==='sas nagar')c='mohali';for(var k in D)if(lc(k)===c)return k;return ''}
 function cities(){
  var o={},out=[];Object.keys(D).forEach(function(c){o[lc(c)]=c});
  customs().forEach(function(t){var c=tc(t.city);if(c&&c.length<41&&!key(c)&&!o[lc(c)])o[lc(c)]=c});
  Object.keys(o).forEach(function(k){out.push(o[k])});return out.sort(nat);
 }
 function areas(city){
  var k=key(city),base=k?D[k].slice():[],seen={};base.forEach(function(a){seen[lc(a)]=1});
  customs().forEach(function(t){
   if(lc(t.city)!==lc(city)&&!(k&&key(t.city)===k))return;
   [t.area].concat(String(t.travel||'').split(/[,;\n\/]+/)).forEach(function(a){a=tc(a);if(a&&a.length<41&&!seen[lc(a)]){seen[lc(a)]=1;base.push(a)}});
  });
  return base.sort(nat);
 }
 function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 var OTHER='__other';
 function has(list,v){var l=lc(v);for(var i=0;i<list.length;i++)if(lc(list[i])===l)return list[i];return ''}
 function optionsHTML(kind,val,city,lbl,noOther){
  var list=kind==='city'?cities():areas(city),pick=val?has(list,val):'',h='';
  if(kind==='area'&&!city)return '<option value="">Select city first</option>';
  h+='<option value=""'+(!val?' selected':'')+'>'+(kind==='city'?'Select city':(list.length?'Select area / locality':'Select area / locality'))+'</option>';
  list.forEach(function(x){
   var label=lbl&&lbl[lc(x)]?x+' ('+lbl[lc(x)]+')':x;
   h+='<option value="'+esc(x)+'"'+(pick&&pick===x?' selected':'')+'>'+esc(label)+'</option>';
  });
  if(!noOther)h+='<option value="'+OTHER+'"'+(val&&!pick?' selected':'')+'>Other (not listed)</option>';
  return h;
 }
 /* select + hidden text input that keeps the original id and value */
 function fieldHTML(o){
  var kind=o.kind,val=String(o.val||'').trim(),city=o.city||'';
  var list=kind==='city'?cities():areas(city),isOther=!!val&&!has(list,val)&&!(kind==='area'&&!city);
  return '<select class="pl-sel" data-for="'+esc(o.id)+'" data-kind="'+kind+'"'+(o.areaId?' data-area="'+esc(o.areaId)+'"':'')+(o.cityId?' data-city="'+esc(o.cityId)+'"':'')+' aria-label="'+(kind==='city'?'City':'Area or locality')+'">'+optionsHTML(kind,val,city)+'</select>'+
   '<input id="'+esc(o.id)+'" type="text" class="pl-txt" maxlength="40" autocomplete="off" value="'+esc(val)+'" placeholder="'+(kind==='city'?'Type your city name':'Type your area / locality')+'"'+(isOther?'':' style="display:none"')+'>';
 }
 function byFor(id){return document.querySelector('.pl-sel[data-for="'+id+'"]')}
 function sync(sel){
  var txt=document.getElementById(sel.getAttribute('data-for'));if(!txt)return;
  if(sel.value===OTHER){txt.style.display='';txt.value='';try{txt.focus()}catch(e){}}
  else{txt.style.display='none';txt.value=sel.value}
  txt.dispatchEvent(new Event('input',{bubbles:true}));txt.dispatchEvent(new Event('change',{bubbles:true}));
 }
 document.addEventListener('change',function(e){
  var sel=e.target&&e.target.classList&&e.target.classList.contains('pl-sel')?e.target:null;if(!sel)return;
  sync(sel);
  var aid=sel.getAttribute('data-area');
  if(sel.getAttribute('data-kind')==='city'&&aid){
   var as=byFor(aid),at=document.getElementById(aid);if(!as)return;
   var city=sel.value===OTHER?'':sel.value;
   as.innerHTML=optionsHTML('area','',city);
   if(sel.value===OTHER){as.innerHTML='<option value="'+OTHER+'" selected>Other (not listed)</option>';sync(as)}
   else{if(at){at.value='';at.style.display='none'}}
   if(at)at.dispatchEvent(new Event('input',{bubbles:true}));
  }
 });
 document.addEventListener('reset',function(e){
  var f=e.target;if(!f||!f.querySelectorAll)return;
  setTimeout(function(){var sels=f.querySelectorAll('.pl-sel');Array.prototype.forEach.call(sels,function(sel){sel.dispatchEvent(new Event('change',{bubbles:true}))})},0);
 });
 /* turn existing text inputs into dropdowns (keeps the inputs, hidden, so their ids and values still work) */
 function upgrade(cityId,areaId){
  var c=document.getElementById(cityId),a=areaId&&document.getElementById(areaId);if(!c)return;
  function mk(inp,kind,city,aid,cid){
   inp.removeAttribute('list');
   var val=inp.value.trim(),list=kind==='city'?cities():areas(city),isOther=!!val&&!has(list,val);
   var s=document.createElement('select');s.className='pl-sel';s.setAttribute('data-for',inp.id);s.setAttribute('data-kind',kind);if(aid)s.setAttribute('data-area',aid);
   s.setAttribute('aria-label',kind==='city'?'City':'Area or locality');s.innerHTML=optionsHTML(kind,val,city);
   inp.classList.add('pl-txt');inp.style.display=isOther?'':'none';inp.parentNode.insertBefore(s,inp);
   if(!s.getAttribute('style')&&inp.style.width)s.style.width=inp.style.width;
   return s;
  }
  mk(c,'city','',a?areaId:'');if(a)mk(a,'area',c.value.trim());
 }
 var CM=null;
 function canonMap(){if(CM)return CM;CM={};Object.keys(D).forEach(function(c){CM[lc(c)]=c;D[c].forEach(function(a){if(!CM[lc(a)])CM[lc(a)]=a})});return CM}
 /* proper casing: "brs nagar" -> "BRS Nagar", "sec 20" -> "Sector 20" */
 function canon(kind,val,city){
  var v=String(val||'').replace(/\s+/g,' ').trim();if(!v)return '';
  if(kind==='city')return key(v)||tc(v);
  v=v.replace(/^(sector|sec)\.?\s*-?\s*(?=\d)/i,'Sector ').replace(/^(phase|ph)\.?\s*-?\s*(?=\d)/i,'Phase ');
  return (city&&has(areas(city),v))||canonMap()[lc(v)]||tc(v);
 }
 /* current value of a field made by fieldHTML/upgrade */
 function read(id){var e=document.getElementById(id);return e?e.value.trim():''}
 /* options for external filters: [{area,label}] with verified counts */
 var st=document.createElement('style');
 st.textContent='.pl-sel{width:100%;font:inherit;padding:11px 12px;border:1.5px solid var(--line,#eadfc9);border-radius:10px;background:#fff;color:var(--navy,#1A2035)}.pl-txt{margin-top:8px}';
 document.head.appendChild(st);
 window.ModivsPlaces={cities:cities,areas:areas,fieldHTML:fieldHTML,upgrade:upgrade,read:read,canon:canon,optionsHTML:optionsHTML,OTHER:OTHER,key:key};
})();
