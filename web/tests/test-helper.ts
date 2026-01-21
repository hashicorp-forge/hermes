import Application from 'hermes/app';
import config from 'hermes/config/environment';
import * as QUnit from 'qunit';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start } from 'ember-qunit';
import { loadTests } from 'ember-qunit/test-loader';
import './helpers/flash-message';

setApplication(Application.create(config.APP));

setup(QUnit.assert);

loadTests();
start();
