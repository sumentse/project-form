// @ngInject
import angular from 'angular';
import './administration';
import formController from './form.controller';
import templateController from './template.controller';
import entryController from './entry.controller';
import entriesController from './entries.controller';
import templatesController from './templates.controller';


angular.module('app.controllers', [
    'administration.module'
])
.controller('form.controller', formController)
.controller('template.controller', templateController)
.controller('entry.controller', entryController)
.controller('entries.controller', entriesController)
.controller('templates.controller', templatesController)

export default 'app.controllers';