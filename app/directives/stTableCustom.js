// @ngInject
angular.module('stTableCustom', [])
    .directive('myEnter', () => {
        return (scope, element, attrs) => {
            //prevents double click on keypress enter
            element.bind("keydown keypress", (event) => {
                if (event.which === 13) {
                    scope.$apply(() => {
                        scope.$eval(attrs.myEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    })
    .directive('pageSelect', () => {
        //this directive controls the pagination on tables
        return {
            restrict: 'E',
            require: '^stTable',
            template: '<input type="text" class="select-page" ng-model="inputPage" ng-change="selectPage(inputPage)" ng-model-options="{ debounce: 500 }">',
            link: (scope, element, attrs) => {

                //watch if the input page is greater than total page
                scope.$watch('numPages', (n,o)=>{
                    if(angular.isDefined(scope.inputPage) && angular.isDefined(n)) {
                        if(scope.inputPage > n) {
                            scope.inputPage = 1;
                            scope.selectPage(scope.inputPage);
                        }
                    }
                });

                scope.$watch('inputPage', (n, o)=>{
                    //prevents the input to go over the max pagination
                    if(angular.isDefined(scope.numPages)){
                        if(n > scope.numPages) {
                            scope.inputPage = scope.numPages;
                            scope.selectPage(scope.inputPage);
                        } else if (n < 1) {
                            scope.inputPage = 1;
                            scope.selectPage(scope.inputPage);
                        }
                    }
                });

                scope.$watch('currentPage', (c) => {
                    scope.inputPage = c;
                });

                scope.$on('currentPage', (event, args) => {

                    if (scope.currentPage < scope.numPages) {
                        scope.selectPage(scope.pages[scope.pages.length - 1]);
                    }

                });
            }
        }
    })
    .directive('customEvent', () => {
        return {
            require: 'stTable',
            restrict: 'A',
            link: (scope, elem, attr, table) => {
                let tableState = table.tableState();

                scope.$on('refreshTable', (event, params) => {

                    if(params) {
                        
                        table.pipe(angular.merge(tableState, {
                            search: {
                                predicateObject: params
                            }
                        }));

                    } else {
                        table.pipe(tableState);
                    }
                    

                });

            }
        }
    })

export default 'stTableCustom';