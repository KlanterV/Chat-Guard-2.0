const client = global.client;
const db = require('./db');
const config = require('./config');

async function Punish(message, GuardType, Embed) {
    let result = false;
    const Database = await db.findOne({ ServerID: message.guild.id });
    const MuteRole = message.guild.roles.cache.find(role => role.id === Database.MutedRoleID);
    const LogChannel = message.guild.channels.cache.find(channel => channel.id === Database.PunishLogChannelID);
    let MuteSüresi = Database.MuteDurationMinute;

    if(message.member.roles.cache.has(MuteRole)) return;
    if(Database.MuteDurationMinute < 1)MuteSüresi = 60;
    const CanBeMuted = MuteRole && message.guild.me.hasPermission('MANAGE_ROLES');
    const CanBeLog = LogChannel && LogChannel.type === 'text';

    if (!CanBeMuted) return console.log('WARN - İşlem gerçekleşemedi. Sebep: "Rolleri yönet" yetkisi veya "Mute rolü" bulunamadı');
    if(!CanBeLog) return console.log('WARN - İşlem gerçekleşemedi. Sebep: Belirli bir "Log Kanalı" bulunamadı');
    if(Database.BlueListMembers.includes(message.member.id) === true)result = true;
    if(result === true) {

        await db.findOneAndUpdate({ ServerID: message.guild.id }, { $pull: { BlueListMembers: message.member.id }});
        await db.findOneAndUpdate({ ServerID: message.guild.id }, { $push: { BlackListMembers: message.member.id } }, { upsert: true });

        message.member.roles.add(MuteRole);
     
        setTimeout(async() => { 
            await db.findOneAndUpdate({ ServerID: message.guild.id }, { $pull: { BlackListMembers: message.member.id } }); 
            message.member.roles.remove(MuteRole).catch(() => {}); }, MuteSüresi * 1000 * 60 ); 

        if(GuardType === 'CharacterLimit') {
            message.channel.send(Embed.setDescription('<@'+message.author.id+'>, Aşırı karakter kullandığın için **'+MuteSüresi+'** Dakika Mute yedin. Lütfen kurallara uymaya özen göster')).catch(() => {});
            return LogChannel.send(Embed.setDescription('<@'+message.author.id+'>, Nickli kullanıcı '+message.content.length+' uzunluğunda mesaj yazdığı için **'+MuteSüresi+'** Dakika boyunca mutelendi.')).catch(() => {});
        }
        if(GuardType === 'MassPingGuard') {
            message.channel.send(Embed.setDescription('<@'+message.author.id+'>, Aşırı etiket attığın için **'+MuteSüresi+'** Dakika Mute yedin. Lütfen kurallara uymaya özen göster!')).catch(() => {});
            return LogChannel.send(Embed.setDescription('<@'+message.author.id+'>, Nickli kullanıcı mesajında **'+message.mentions.users.size+'** kişiyi etiketlediği için **'+MuteSüresi+'** Dakika boyunca mutelendi.')).catch(() => {});
        }
        if(GuardType === 'InviteGuard') {
            message.channel.send(Embed.setDescription('<@'+message.author.id+'>, Sunucu daveti attığın için **'+MuteSüresi+'** Dakika Mute yedin. Lütfen kurallara uymaya özen göster')).catch(() => {});
            return LogChannel.send(Embed.setDescription('<@'+message.author.id+'>, Nickli kullanıcı **'+message.content+'** içerikli mesajında sunucu daveti bulunduğu için **'+MuteSüresi+'** Dakika boyunca mutelendi.')).catch(() => {});
        }
        if(GuardType === 'SpamGuard') {
            message.channel.send(Embed.setDescription('<@'+message.author.id+'>, Spam yaptığın için **'+MuteSüresi+'** Dakika Mute yedin. Lütfen kurallara uymaya özen göster')).catch(() => {});
            return LogChannel.send(Embed.setDescription('<@'+message.author.id+'>, Nickli kullanıcı Spam yaptığı için **'+MuteSüresi+'** Dakika boyunca mutelendi.')).catch(() => {});
        }
    }
    if(result === false) {

        await db.findOneAndUpdate({ ServerID: message.guild.id }, { $push: { BlueListMembers: message.member.id } }, { upsert: true });
        setTimeout(async() => {
            await db.findOneAndUpdate({ ServerID: message.guild.id }, { $pull: { BlueListMembers: message.member.id } }); }, 7200000); 

        if(GuardType === 'CharacterLimit') {
            message.channel.send(Embed.setDescription('<@'+message.author.id+'>, Aşırı karakter kullanman yasak, tekrarı durumunda ceza alacaksın !')).catch(() => {});
            return LogChannel.send(Embed.setDescription('<@'+message.author.id+'>, Nickli kullanıcı **'+message.content.length+'** uzunluğunda mesaj yazdığı için uyarı aldı.')).catch(() => {});
        }
        if(GuardType === 'MassPingGuard') {
            message.channel.send(Embed.setDescription('<@'+message.author.id+'>, Aşırı etiket atman yasak, tekrarı durumunda ceza alacaksın !')).catch(() => {});
            return LogChannel.send(Embed.setDescription('<@'+message.author.id+'>, Nickli kullanıcı mesajında **'+message.mentions.users.size+'** kişiyi etiketlediği için uyarı aldı.')).catch(() => {});
        }
        if(GuardType === 'InviteGuard') {
            message.channel.send(Embed.setDescription('<@'+message.author.id+'>, Sunucu Daveti atman yasak, tekrarı durumunda ceza alacaksınız !')).catch(() => {});
            return LogChannel.send(Embed.setDescription('<@'+message.author.id+'>, Nickli kullanıcı **'+message.content+'** içerikli mesajında sunucu daveti bulunduğu için uyarı aldı.')).catch(() => {});
        }
        if(GuardType === 'SpamGuard') {
            message.channel.send(Embed.setDescription('<@'+message.author.id+'>, Spam yapman yasak, tekrarı durumunda ceza alacaksınız !')).catch(() => {});
            return LogChannel.send(Embed.setDescription('<@'+message.author.id+'>, Nickli kullanıcı Spam yaptığı için uyarı aldı.')).catch(() => {});
        }
    }
    return result;
}
  
async function WhiteList(message) {
    let result = false;
    const Database = await db.findOne({ ServerID: message.guild.id });
    if (Database && Database.WhiteListMembers.includes(message.member.id) === true)result = true;
    if(Database && Database.WhiteListChannels.includes(message.channel.id) === true)result = true;
    let roles = message.member.roles.cache.map(role => role.id);
    if (roles.some(role => Database.WhiteListRoles.includes(role)))result = true;
    return result;
}

function BadWord(mesajicerigi) {
    let result = false;
    let array = ['allahoc','allahoç','allahamk','allahaq','0r0spuc0cu','4n4n1 sk3r1m','p1c','@n@nı skrm','orsb','orsbcogu','amnskm','anaskm','oc','abaza','abazan','ag','a\u011fz\u0131na s\u0131\u00e7ay\u0131m','fuck','shit','ahmak','seks','sex','allahs\u0131z','amar\u0131m','ambiti','am biti','amc\u0131\u011f\u0131','amc\u0131\u011f\u0131n','amc\u0131\u011f\u0131n\u0131','amc\u0131\u011f\u0131n\u0131z\u0131','amc\u0131k','amc\u0131k ho\u015faf\u0131','amc\u0131klama','amc\u0131kland\u0131','amcik','amck','amckl','amcklama','amcklaryla','amckta','amcktan','amcuk','am\u0131k','am\u0131na','amına','am\u0131nako','am\u0131na koy','am\u0131na koyar\u0131m','am\u0131na koyay\u0131m','am\u0131nakoyim','am\u0131na koyyim','am\u0131na s','am\u0131na sikem','am\u0131na sokam','am\u0131n feryad\u0131','am\u0131n\u0131','am\u0131n\u0131 s','am\u0131n oglu','am\u0131no\u011flu','am\u0131n o\u011flu','am\u0131s\u0131na','am\u0131s\u0131n\u0131','amina','amina g','amina k','aminako','aminakoyarim','amina koyarim','amina koyay\u0131m','amina koyayim','aminakoyim','aminda','amindan','amindayken','amini','aminiyarraaniskiim','aminoglu','amin oglu','amiyum','amk','amkafa','amk \u00e7ocu\u011fu','amlarnzn','aml\u0131','amm','ammak','ammna','amn','amna','amnda','amndaki','amngtn','amnn','amona','amq','ams\u0131z','amsiz','amsz','amteri','amugaa','amu\u011fa','amuna','ana','anaaann','anal','analarn','anam','anamla','anan','anana','anandan','anan\u0131','anan\u0131','anan\u0131n','anan\u0131n am','anan\u0131n am\u0131','anan\u0131n d\u00f6l\u00fc','anan\u0131nki','anan\u0131sikerim','anan\u0131 sikerim','anan\u0131sikeyim','anan\u0131 sikeyim','anan\u0131z\u0131n','anan\u0131z\u0131n am','anani','ananin','ananisikerim','anani sikerim','ananisikeyim','anani sikeyim','anann','ananz','anas','anas\u0131n\u0131','anas\u0131n\u0131n am','anas\u0131 orospu','anasi','anasinin','anay','anayin','angut','anneni','annenin','annesiz','anuna','aq','a.q','a.q.','aq.','ass','atkafas\u0131','atm\u0131k','att\u0131rd\u0131\u011f\u0131m','attrrm','auzlu','avrat','ayklarmalrmsikerim','azd\u0131m','azd\u0131r','azd\u0131r\u0131c\u0131','babaannesi ka\u015far','baban\u0131','baban\u0131n','babani','babas\u0131 pezevenk','baca\u011f\u0131na s\u0131\u00e7ay\u0131m','bac\u0131na','bac\u0131n\u0131','bac\u0131n\u0131n','bacini','bacn','bacndan','bacy','bastard','b\u0131z\u0131r','bitch','biting','boner','bosalmak','bo\u015falmak','cenabet','cibiliyetsiz','cibilliyetini','cibilliyetsiz','cif','cikar','cim','\u00e7\u00fck','dalaks\u0131z','dallama','daltassak','dalyarak','dalyarrak','dangalak','dassagi','diktim','dildo','dingil','dingilini','dinsiz','dkerim','domal','domalan','domald\u0131','domald\u0131n','domal\u0131k','domal\u0131yor','domalmak','domalm\u0131\u015f','domals\u0131n','domalt','domaltarak','domalt\u0131p','domalt\u0131r','domalt\u0131r\u0131m','domaltip','domaltmak','d\u00f6l\u00fc','d\u00f6nek','d\u00fcd\u00fck','eben','ebeni','ebenin','ebeninki','ebleh','ecdad\u0131n\u0131','ecdadini','embesil','emi','fahise','fahi\u015fe','feri\u015ftah','ferre','fuck','fucker','fuckin','fucking','gavad','gavat','giberim','giberler','gibis','gibi\u015f','gibmek','gibtiler','goddamn','godo\u015f','godumun','gotelek','gotlalesi','gotlu','gotten','gotundeki','gotunden','gotune','gotunu','gotveren','goyiim','goyum','goyuyim','goyyim','g\u00f6t','g\u00f6t deli\u011fi','g\u00f6telek','g\u00f6t herif','g\u00f6tlalesi','g\u00f6tlek','g\u00f6to\u011flan\u0131','g\u00f6t o\u011flan\u0131','g\u00f6to\u015f','g\u00f6tten','g\u00f6t\u00fc','g\u00f6t\u00fcn','g\u00f6t\u00fcne','g\u00f6t\u00fcnekoyim','g\u00f6t\u00fcne koyim','g\u00f6t\u00fcn\u00fc','g\u00f6tveren','g\u00f6t veren','g\u00f6t verir','gtelek','gtn','gtnde','gtnden','gtne','gtten','gtveren','hasiktir','hassikome','hassiktir','has siktir','hassittir','haysiyetsiz','hayvan herif','ho\u015faf\u0131','h\u00f6d\u00fck','hsktr','huur','\u0131bnel\u0131k','ibina','ibine','ibinenin','ibne','ibnedir','ibneleri','ibnelik','ibnelri','ibneni','ibnenin','ibnerator','ibnesi','idiot','idiyot','imansz','ipne','iserim','i\u015ferim','ito\u011flu it','kafam girsin','kafas\u0131z','kafasiz','kahpe','kahpenin','kahpenin feryad\u0131','kaka','kaltak','kanc\u0131k','kancik','kappe','karhane','ka\u015far','kavat','kavatn','kaypak','kayyum','kerane','kerhane','kerhanelerde','kevase','keva\u015fe','kevvase','koca g\u00f6t','kodu\u011fmun','kodu\u011fmunun','kodumun','kodumunun','koduumun','koyarm','koyay\u0131m','koyiim','koyiiym','koyim','koyum','koyyim','krar','kukudaym','laciye boyad\u0131m','libo\u015f','madafaka','malafat','malak','mcik','memelerini','mezveleli','minaamc\u0131k','mincikliyim','mna','monakkoluyum','motherfucker','mudik','oc','ocuu','ocuun','O\u00c7','o\u00e7','o. \u00e7ocu\u011fu','o\u011flan','o\u011flanc\u0131','o\u011flu it','orosbucocuu','orospu','orospucocugu','orospu cocugu','orospu \u00e7oc','orospu\u00e7ocu\u011fu','orospu \u00e7ocu\u011fu','orospu \u00e7ocu\u011fudur','orospu \u00e7ocuklar\u0131','orospudur','orospular','orospunun','orospunun evlad\u0131','orospuydu','orospuyuz','orostoban','orostopol','orrospu','oruspu','oruspu\u00e7ocu\u011fu','oruspu \u00e7ocu\u011fu','osbir','ossurduum','ossurmak','ossuruk','osur','osurduu','osuruk','osururum','otuzbir','\u00f6k\u00fcz','\u00f6\u015fex','patlak zar','penis','pezevek','pezeven','pezeveng','pezevengi','pezevengin evlad\u0131','pezevenk','pezo','pic','pici','picler','pi\u00e7','pi\u00e7in o\u011flu','pi\u00e7 kurusu','pi\u00e7ler','pipi','pipi\u015f','pisliktir','porno','pussy','pu\u015ft','pu\u015fttur','rahminde','revizyonist','s1kerim','s1kerm','s1krm','sakso','saksofon','saxo','sekis','serefsiz','sevgi koyar\u0131m','sevi\u015felim','sexs','s\u0131\u00e7ar\u0131m','s\u0131\u00e7t\u0131\u011f\u0131m','s\u0131ecem','sicarsin','sie','sik','sikdi','sikdi\u011fim','sike','sikecem','sikem','siken','sikenin','siker','sikerim','sikerler','sikersin','sikertir','sikertmek','sikesen','sikesicenin','sikey','sikeydim','sikeyim','sikeym','siki','sikicem','sikici','sikien','sikienler','sikiiim','sikiiimmm','sikiim','sikiir','sikiirken','sikik','sikil','sikildiini','sikilesice','sikilmi','sikilmie','sikilmis','sikilmi\u015f','sikilsin','sikim','sikimde','sikimden','sikime','sikimi','sikimiin','sikimin','sikimle','sikimsonik','sikimtrak','sikin','sikinde','sikinden','sikine','sikini','sikip','sikis','sikisek','sikisen','sikish','sikismis','siki\u015f','siki\u015fen','siki\u015fme','sikitiin','sikiyim','sikiym','sikiyorum','sikkim','sikko','sikleri','sikleriii','sikli','sikm','sikmek','sikmem','sikmiler','sikmisligim','siksem','sikseydin','sikseyidin','siksin','siksinbaya','siksinler','siksiz','siksok','siksz','sikt','sikti','siktigimin','siktigiminin','sikti\u011fim','sikti\u011fimin','sikti\u011fiminin','siktii','siktiim','siktiimin','siktiiminin','siktiler','siktim','siktim','siktimin','siktiminin','siktir','siktir et','siktirgit','siktir git','siktirir','siktiririm','siktiriyor','siktir lan','siktirolgit','siktir ol git','sittimin','sittir','skcem','skecem','skem','sker','skerim','skerm','skeyim','skiim','skik','skim','skime','skmek','sksin','sksn','sksz','sktiimin','sktrr','skyim','slaleni','sokam','sokar\u0131m','sokarim','sokarm','sokarmkoduumun','sokay\u0131m','sokaym','sokiim','soktu\u011fumunun','sokuk','sokum','soku\u015f','sokuyum','soxum','sulaleni','s\u00fclaleni','s\u00fclalenizi','s\u00fcrt\u00fck','\u015ferefsiz','\u015f\u0131ll\u0131k','taaklarn','taaklarna','tarrakimin','tasak','tassak','ta\u015fak','ta\u015f\u015fak','tipini s.k','tipinizi s.keyim','tiyniyat','toplarm','topsun','toto\u015f','vajina','vajinan\u0131','veled','veledizina','veled i zina','verdiimin','weled','weledizina','whore','xikeyim','yaaraaa','yalama','yalar\u0131m','yalarun','yaraaam','yarak','yaraks\u0131z','yaraktr','yaram','yaraminbasi','yaramn','yararmorospunun','yarra','yarraaaa','yarraak','yarraam','yarraam\u0131','yarragi','yarragimi','yarragina','yarragindan','yarragm','yarra\u011f','yarra\u011f\u0131m','yarra\u011f\u0131m\u0131','yarraimin','yarrak','yarram','yarramin','yarraminba\u015f\u0131','yarramn','yarran','yarrana','yarrrak','yavak','yav\u015f','yav\u015fak','yav\u015fakt\u0131r','yavu\u015fak','y\u0131l\u0131\u015f\u0131k','yilisik','yogurtlayam','yo\u011furtlayam','yrrak','zibidi','zigsin','zikeyim','zikiiim','zikiim','zikik','zikim','ziksiiin','ziksiin','zulliyetini','zviyetini'];
    if (array.some(Word => ` ${mesajicerigi.toLowerCase()} `.includes(` ${Word} `)))result = true;
    return result;
}
  
function RandomColor(Boolean) {
    if(Boolean !== true) return;
    const array = ['40E1E3', 'FFBAD6', 'C8A8FD', 'F4DDA9', '6F1811', '56B8D3', '846DE2', 'FC7FAC', '61FF64', '253FCF'];
    const randomIndex = Math.floor(Math.random() * array.length);
    const Random = array[randomIndex];
    return Random;
}

client.cache = {
    mesajlar: []
};

async function Spam(message) {
    let result = false;
    const suankimesaj = {
        messageID: message.id,
        guildID: message.guild.id,
        authorID: message.author.id,
        channelID: message.channel.id,
        sentTimestamp: message.createdTimestamp
    };
    client.cache.mesajlar.push(suankimesaj);

    const spammesaji = client.cache.mesajlar.filter((db) => db.authorID === message.author.id && db.guildID === message.guild.id);

    const spamsayısı = spammesaji.filter((db) => db.sentTimestamp > (Date.now() - 2000));
    
    if(spamsayısı.length >= 12){await reset(); return result = true; }
    return result;
}

function reset () {
    client.cache = {
        mesajlar: []
    };}


module.exports = exports = { Spam, RandomColor, BadWord, WhiteList, Punish };   
