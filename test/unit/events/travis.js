const simple = require("simple-mock");
const test = require("tap").test;

const homePath = `${__dirname}/../../../src`;
const client = require(`${homePath}/client.js`);
const travis = require(`${homePath}/events/travis.js`);

const payload = {
  state: "passed",
  pull_request: false,
  pull_request_number: 69,
  build_url: "https://travis-ci.org",
  repository: {
    owner_name: "publiclab",
    name: "publiclabbot"
  }
};

const templates = new Map([
  ["travisPass", "[tests]({url})"],
  ["travisFail", "{state} {buildLogs}"]
]);

templates.forEach((value, key) => {
  const template = client.templates.get(key);
  template.content = value;
  client.templates.set(key, template);
});

test("Ignore if build result isn't for a pull request", async t => {
  const response = await travis.run.call(client, payload);

  t.equals(response, false);

  t.end();
});

test("Ignore if no there is no Travis configuration", async t => {
  payload.pull_request = true;
  client.cfg.pulls.ci.travis = null;

  const response = await travis.run.call(client, payload);

  t.equals(response, false);

  t.end();
});

test("Ignore if pull request has no configured Travis label", async t => {
  client.cfg.pulls.ci.travis = "travis";

  const request = simple.mock(client.issues, "getIssueLabels").resolveWith({
    data: []
  });

  const response = await travis.run.call(client, payload);

  t.equals(request.lastCall.arg.owner, "publiclab");
  t.equals(request.lastCall.arg.repo, "publiclabbot");
  t.equals(request.lastCall.arg.number, 69);
  t.equals(response, false);

  t.end();
});

test("Alert about passing build", async t => {
  const request = simple.mock(client.issues, "getIssueLabels").resolveWith({
    data: [{name: "travis"}]
  });

  const message = "[tests](https://travis-ci.org)";
  const request2 = simple.mock(client.issues, "createComment").resolveWith({
    data: {
      body: message
    }
  });

  const response = await travis.run.call(client, payload);

  t.equals(request.lastCall.arg.owner, "publiclab");
  t.equals(request.lastCall.arg.repo, "publiclabbot");
  t.equals(request.lastCall.arg.number, 69);
  t.equals(request2.lastCall.arg.owner, "publiclab");
  t.equals(request2.lastCall.arg.repo, "publiclabbot");
  t.equals(request2.lastCall.arg.number, 69);
  t.equals(request2.lastCall.arg.body, message);
  t.equals(response.data.body, message);

  t.end();
});

test("Alert about failing build", async t => {
  payload.state = "failed";
  const request = simple.mock(client.issues, "getIssueLabels").resolveWith({
    data: [{name: "travis"}]
  });

  const error = "failed [build logs](https://travis-ci.org)";
  const request2 = simple.mock(client.issues, "createComment").resolveWith({
    data: {
      body: error
    }
  });

  const response = await travis.run.call(client, payload);

  t.equals(request.lastCall.arg.owner, "publiclab");
  t.equals(request.lastCall.arg.repo, "publiclabbot");
  t.equals(request.lastCall.arg.number, 69);
  t.equals(request2.lastCall.arg.owner, "publiclab");
  t.equals(request2.lastCall.arg.repo, "publiclabbot");
  t.equals(request2.lastCall.arg.number, 69);
  t.equals(request2.lastCall.arg.body, error);
  t.equals(response.data.body, error);

  t.end();
});
