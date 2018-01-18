const request = require('request');
const EventEmitter = require('events');
const querystring = require('querystring');

const debug = require('debug')('wex');

let config = {
	url: 'https://wex.nz/api/3/',
	pairs: ['btc_usd','btc_rur','btc_eur','ltc_btc','ltc_usd','ltc_rur','ltc_eur','nmc_btc','nmc_usd','nvc_btc','nvc_usd','usd_rur','eur_usd','eur_rur','ppc_btc','ppc_usd','dsh_btc','dsh_usd','dsh_rur','dsh_eur','dsh_ltc','dsh_eth','dsh_zec','eth_btc','eth_usd','eth_eur','eth_ltc','eth_rur','eth_zec','bch_usd','bch_btc','bch_rur','bch_eur','bch_ltc','bch_eth','bch_dsh','bch_zec','zec_btc','zec_usd','zec_ltc','usdet_usd','ruret_rur','euret_eur','btcet_btc','ltcet_ltc','ethet_eth','nmcet_nmc','nvcet_nvc','ppcet_ppc','dshet_dsh','bchet_bch'],
};

class Wex extends EventEmitter {
	/**
	 * Constructor(options)
	 * @param pollInterval - how often pollData (ticker) will be emitted (default: -1)
	 * */
	constructor({ pollInterval = -1 }) {
		super();
		this.pollInterval = pollInterval;

		if (this.pollInterval > 0) {
			this.doPoll();
		}
	}
	request(method, opts = {}, queryOpts = {}) {
		return new Promise((resolve, reject) => {
			let data = querystring.stringify(opts);
			let url = !!/^https?:\/\//ig.exec(method) ? method : config.url + method;

			let options = Object.assign({
				url,
				method: 'GET',
				form: data,
				json: true,
			}, queryOpts);

			if (options.method === 'GET') {
				options.url += '?' + data;
			}

			request(options, (err, response = {}, body) => {
				if (err || response.statusCode !== 200) {
					err = err ? err : new Error('HTTP statusCode ' + response.statusCode);

					return reject(err);
				}

				if (typeof body !== 'object' || body === null) {
					return reject('Response isn\'t JSON');
				}

				return resolve(body);
			});
		});
	}
	dataLikeExmo(data) {
		let res = {};

		for (let i in data) {
			if (data.hasOwnProperty(i)) {
				const pair = data[i];

				res[i.toUpperCase()] = {
					buy_price: String(pair['buy']),
					sell_price: String(pair['sell']),
					last_trade: String(pair['last']),
					high: String(pair['high']),
					low: String(pair['low']),
					avg: String(pair['avg']),
					vol: String(pair['vol']),
					vol_curr: String(pair['vol_cur']),
					updated: Number(pair['updated'])
				};
			}
		}

		return res;
	}
	doPoll() {
		debug('do poll');

		this.request(config.url + 'ticker/' + config.pairs.join('-') + '?ignore_invalid=1')
			.then((data) => {
				data = this.dataLikeExmo(data);

				this.emit('ticker', data);
				this.emit('pollData', data);
				return setTimeout(this.doPoll.bind(this), this.pollInterval);
			})
			.catch((err) => {
				this.emit('pollError', err);
				debug('poll error %s', err.message);
				return setTimeout(this.doPoll.bind(this), this.pollInterval);
			})
	}
}

module.exports = Wex;