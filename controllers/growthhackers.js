'use strict';
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const request = require('request');
const baseUrl = 'https://growthhackers.com';
const {config} = require('../config');
const pathFile = config.pathFile;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function getPostsFromOnePage(page) {
    return new Promise(async (resolve, reject) => {
        try {
            await page.waitFor(1000);
            const posts = await page.evaluate(() => {
                let result = [];
                const posts = document.querySelectorAll('.posts > .post');
                for (let i = 0; i < posts.length; i++) {
                    try {
                        const numberComments = posts[i].querySelector("a.comments-section").innerText;
                        if (numberComments && numberComments > 0) {
                            const link = posts[i].querySelector("div.post-content > h3 > a").getAttribute("href");
                            console.log(numberComments);
                            console.log(link);
                            result.push(numberComments + ' || ' + link);
                        }
                    } catch (e) {
                        console.log(e);
                        continue;
                    }
                }
                debugger;
                return result;
            });
            resolve(posts);
        } catch (e) {
            console.log(e);
            resolve(false);
        }
    })
}

async function getUsersFromPost(postLink) {
    return new Promise(function (resolve, reject) {
        request(postLink, (error, response, body) => {
            if (error || response && response.statusCode != 200) {
                console.log('Error in getUsersFromPost ', error);
                resolve(false);
            }
            const $ = cheerio.load(body);
            const usersLink = [];
            try {
                $('h3.comments__author > a').each(function (index, element) {
                    usersLink.push([$(element).attr('href'), $(element).text()]);
                });
            } catch (e) {
                resolve(false);
            }
            resolve(usersLink);
        })
    });
}

async function getUserInfo(userLink, pause = 10000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            request(userLink, (error, response, body) => {
                if (error || response && response.statusCode != 200) {
                    console.log('Error in getUserInfo', 'error: ' + error, userLink);
                    resolve(false);
                }
                const $ = cheerio.load(body);
                let name = '',
                    aboutMe = '',
                    experience = '',
                    experienceLink = '',
                    location = '',
                    upvotes = '',
                    submissions = '',
                    comments = '',
                    questions = '',
                    siteLink = '';
                const socialsLinks = [];
                try {
                    name = $('#my-profile-about-holder > h1').text();
                    name = name.split('\n')[1] ? name.split('\n')[1] : name;
                    aboutMe = $('#my-profile-about-blocks > div.block > div.bio > span').text().replace('\n', '');
                    experience = $('#my-profile-about-blocks > div.block > div.experience > a').text();
                    experienceLink = $('#my-profile-about-blocks > div.block > div.experience > a').attr('href');
                    location = $('#my-profile-about-blocks > div.block > div.string > div.location > a').text();
                    upvotes = $('#upvoted_profile_tab > a').text() ? $('#upvoted_profile_tab > a').text().split(' ')[0] : 0;
                    submissions = $('#posts_profile_tab > a').text() ? $('#posts_profile_tab > a').text().split(' ')[0] : 0;
                    comments = $('#comments_profile_tab > a').text() ? $('#comments_profile_tab > a').text().split(' ')[0] : 0;
                    questions = $('#questions_profile_tab > a').text() ? $('#questions_profile_tab > a').text().split(' ')[0] : 0;
                    $('#socials-links > div > div:nth-child(1) > div.social.social-my-profile > a.link-social').each(function (index, element) {
                        socialsLinks.push($(element).attr('href').trim());
                    });
                    siteLink = $('#user-site-link').length ? $('#user-site-link').attr('href') : '';
                } catch (e) {
                    console.log(e);
                    resolve(false);
                }
                resolve({
                    userLink,
                    name,
                    aboutMe,
                    experience,
                    experienceLink,
                    location,
                    socialsLinks,
                    siteLink,
                    upvotes,
                    submissions,
                    comments,
                    questions
                });
            })
        }, pause)
    });
}

async function getUsersInfo(allUsersLink, io) {
    const users = [];
    return new Promise(async (resolve, reject) => {
        let count = 0;
        for (const userLink of allUsersLink) {
            count++;
            try {
                const link = userLink[0].split('||');
                const user = await getUserInfo(baseUrl + link[0].trim());
                console.log(user);
                if (user) {
                    users.push(user);
                    io.emit('count_users', {'count': users.length});
                } else {
                    console.log('skip user ', link[0].trim())
                    continue;
                }
            } catch (e) {
                console.log('error in getUsersInfo');
                console.log(e);
                continue;
            }
            if (count === +global.numberUsers) break;
        }
        resolve(users);
    });
}


function countMentionUsers(array) {
    const hashmap = {};
    const unique = [];
    for (let i = 0; i < array.length; i++) {
        let item = array[i];
        let key = item[0] + '||' + item[1];
        if (!hashmap.hasOwnProperty(key)) {
            hashmap[key] = 1;
        } else {
            hashmap[key] = hashmap[key] + 1;
        }
    }
    for (const key in hashmap) {
        unique.push([key, hashmap[key]]);
    }
    unique.sort(function (b, a) {
        return a[1] - b[1];
    });
    return unique;
}

async function writeFileCsv(users) {
    return new Promise((resolve, reject) => {
        const headers = [];
        const records = [];
        let count = 0;
        for (const user of users) {
            if (count === 0) {
                for (const key in user) {
                    headers.push({id: key, title: key});
                }
            }
            records.push(user);
            count++;
        }
        const csvWriter = createCsvWriter({
            path: pathFile,
            header: headers
        });
        csvWriter.writeRecords(records)
            .then(() => {
                console.log('Save new file');
                resolve(count);
            });
    });
}

async function getResult(req, res) {
    let browser, page;
    let postsFromOnePage = [];
    let allPosts = [];
    let io = req.io;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox',
                '--disable-setuid-sandbox'],
            headless: true, slowMo: 250
        });
        page = await browser.newPage();
        await page.setViewport({width: 600, height: 350});
        await page.waitFor(1000);
        await page.goto("https://growthhackers.com/posts", {timeout: 100000});
        await page.waitFor(2000);
        res.status(200).end();
        const numberPages = +global.numberPages + 1;
        for (let i = 2; i <= numberPages; i++) {
            postsFromOnePage.length = 0;
            await page.waitFor(1000);
            postsFromOnePage = await getPostsFromOnePage(page);
            if (postsFromOnePage) {
                allPosts.push(...postsFromOnePage);
                await page.waitFor(1000);
                await page.goto('https://growthhackers.com/page/' + i + '?paginate=true', {timeout: 100000});
                await page.waitFor(2000);
            }
        }
        let allUsers = [];
        for (const post of allPosts) {
            try {
                const link = baseUrl + post.split('||')[1].trim();
                const users = await getUsersFromPost(link);
                allUsers.push(...users);
            } catch (e) {
                console.log(e);
                continue;
            }
        }
        const uniqueUsersWithCount = countMentionUsers(allUsers);
        io.emit('result_array', {uniqueUsersWithCount});
        const usersInfo = await getUsersInfo(uniqueUsersWithCount, io);

        for (const info of usersInfo) {
            console.log(info.userLink, info.name,);
        }
        await page.waitFor(2000);
        await page.close();
        await browser.close();
        console.log("browser.close");
        const saveUsers = await writeFileCsv(usersInfo);
        io.emit('endParsing', {'count': saveUsers});
    } catch (err) {
        res.send("Error!!!!!!  getResult");
        await page.close();
        await browser.close();
        console.log(err)
    }
}

module.exports.parserController = getResult;



