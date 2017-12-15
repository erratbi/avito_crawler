import request from 'request-promise';
import cheerio from 'cheerio';
import serialize from 'serialize-javascript';
import get from 'lodash/get';
import concat from 'lodash/concat';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const LAST_PAGE = 4822;

const getUrlsOnPage = (page = 1) => {
	const uri = `https://m.avito.ma/list?ca=8&w=1&o=${page}`;
	return request({
		uri,
		transform: body => {
			const $ = cheerio.load(body);
			return $('.item_link')
				.map((i, el) => $(el).attr('href'))
				.get();
		}
	}).catch(() => {
		console.log(`Can't conect to avito.ma`);
		return [];
	});
};

const getData = uri => {
	return request({
		uri,
		transform: soup => {
			const title = get(/<h2.+>\n(.+?)\n<\/h2>/gi.exec(soup), '[1]', null);
			const name = get(/<div\sclass="adHeaderBar">\n*<span[^>]*>(.+?)<\/span>/gi.exec(soup), '[1]', null);
			const price = get(/<label>Prix.+?<\/label>\n.+\n.+<span[^>]+>(.+?)<\/span>/gi.exec(soup), '[1]', null);
			const type = get(/<label>Type:.+?<\/label>\n*.*<strong>(.+?)<\/strong>/gi.exec(soup), '[1]', null);
			const location = get(/<label>Ville\/Secteur:.+?<\/label>\n*.*<strong>(.+?)<\/strong>/gi.exec(soup), '[1]', null);
			const phone = get(/<p>Tél.:\s<a.*?>(.+?)<\/a>/gi.exec(soup), '[1]', null);
			return {
				title,
				name,
				title,
				phone,
				price,
				type,
				location
			};
		}
	});
};

(async () => {
	const pages = LAST_PAGE;
	let data = [];
	let t0 = Date.now();
	let t1;
	for (let i = 1; i <= pages; i++) {
		let urls = [];
		let page_data = [];
		try {
			urls = await getUrlsOnPage(i);
			if (!urls.length) break;
			page_data = await Promise.all(urls.map(url => getData(url)));
			t1 = Date.now();
			const diff = (t1 - t0) / 1000;
			t0 = Date.now();
			data = concat(data, page_data);
			writeFileSync(resolve(__dirname, '../data/data.json'), serialize(data));
			console.log(`Page ${i} done in ${diff}s`);
		} catch (error) {
			break;
		}
	}
	console.log(data);
})();
