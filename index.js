const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { resolve } = require('path');

const BASE_URL = 'view-source:gamefaqs.gamespot.com';

const BROWSER_HEADER = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language':' pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'cookie': 'gf_dvi=ZjYwZWE1YjliMDAzM2U0MDM0ZDRlOThiN2RhY2ExNTg4OTRhODI1ZjEwNjkwOWQxZjliODQ2NzlkMWY3NjBlYTViOWI%3D; gf_geo=NDUuMjMzLjQyLjIxNjo3NjoxMDEyNA%3D%3D; dfpsess=j; spt=yes; fv20210712=1; OptanonConsent=isIABGlobal=false&datestamp=Sun+Jul+11+2021+02%3A49%3A30+GMT-0300+(Hor%C3%A1rio+Padr%C3%A3o+de+Bras%C3%ADlia)&version=6.7.0&hosts=&consentId=a1cad6e3-5832-48d3-b911-13e2e2546574&interactionCount=1&landingPath=NotLandingPage&groups=C0002%3A1%2CC0003%3A1%2CC0004%3A1%2CC0005%3A1&AwaitingReconsent=false&geolocation=BR%3BGO; OptanonAlertBoxClosed=2021-07-11T05:49:30.378Z',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'sec-gpc': '1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

const slug = (str) => {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
  
    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

const writeToFile = (data, filename) => {
    const promiseCallBack = (resolve, reject) => {
        fs.writeFile(filename, data, (error) => {
            if(error) {
                reject(error);
                return;
            }
            resolve(true);
        });
    };
    return new Promise(promiseCallBack);
};

const readFromFile = (filename) => {
    const promiseCallBack = (resolve) => {
        fs.readFile(filename, 'utf8', (error, contents) => {
            if(error) {
                resolve(null);
            }
            resolve(contents);
        });
    };
    return new Promise(promiseCallBack);
}; 

const getPage = (path) => {
    const url = `${BASE_URL}${path}`;
    const options = {
        headers: BROWSER_HEADER,
    };
    return axios.get(url, options).then((response) => response.data);
};

const getCachedPage = (path) => {
    const filename = `cache/${slug(path)}.html`;
    const promiseCallBack = async (resolve, reject) => {
        const cachedHTML = await readFromFile(filename);
        if (!cachedHTML) {
            const html = await getPage(path);
            await writeToFile(html, filename);
            resolve(html);
            return;
        }
        resolve(cachedHTML);
    };

    return new Promise(promiseCallBack);
};

const saveData = (data, path) => {
    const promiseCallBack = async (resolve, reject) => {
        if(!data || data.length === 0) return resolve(true);
        const dataToStore = JSON.stringify({data: data}, null, 2);
        const created = await writeToFile(dataToStore, path);
        resolve(true);
    };
    return new Promise(promiseCallBack);
};

const getPageItems = (html) => {
    const $ = cheerio.load(html);
    const promiseCallBack = (resolve, reject) => {
        const selector = '#content > div.post_content.row > div > div:nth-child(1) > div.body > table > tbody > tr';
        
        const games = [];
        $(selector).each((i, element) => {
            const a = $('td.rtitle > a', element);
            const title = a.text();
            const href = a.attr('href');
            const id = href.split('/').pop();
            games.push({id, title, path: href});
        });

        resolve(games);

    }
    
    
    return new Promise(promiseCallBack);
};

const getAllPages = async (start, finish) => {
    let page = start;
    do {
        const path = `/n64/category/999-all?page=${page}`;
        console.log(path);
        await getCachedPage(path)
             .then(getPageItems)
             .then((data) => saveData(data, `./data/db-${page}.json`))
             .then(console.log)
             .catch(console.error);
        page++;
    }while(page < finish);
};

getAllPages(0,10);