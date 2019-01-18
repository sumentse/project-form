// @ngInject
import '@uirouter/angularjs';
import 'angular-animate';
import 'angular-timeago';
import 'angular-sanitize';
import 'angular-touch';
import 'ng-file-upload';
import 'checklist-model';
import 'angular-smart-table';
import 'ui-bootstrap4';

//Custom Directives
import './ng-datalist';
import './custom.directive';
import './stTableCustom';
import './form.directive';

angular.module('app.directives', [
    'custom.directive',
    'form.directive',
    'ngFileUpload',
    'checklist-model',
    'ui.router',
    'yaru22.angular-timeago',
    'smart-table',
    'ngTouch',
    'ngSanitize',
    'ngAnimate',
    'stTableCustom',
    'ui.bootstrap',
    'ng-datalist'
]);

export default 'app.directives';
