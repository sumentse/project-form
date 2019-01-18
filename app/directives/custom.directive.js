// @ngInject

//My library of useful directives
angular.module('custom.directive', [])
    .directive('imageonload', () => {
        return {
            restrict: 'A',
            link: (scope, element, attrs) => {
                element.bind('error', () => {
                    element
                        .attr('src', attrs['noImage']);
                });
            }
        };
    })
    .directive('progressButton', ($timeout) => {
        return {
            restrict: 'EA',
            template: `
                <div class="btn progress-button ng-class:{'initial btn-success': buttonStatus === 'initial', 'pending btn-primary':buttonStatus === 'pending', 'btn-success':buttonStatus === 'complete'}">
                    <span class="ng-class:{'hide': buttonStatus === 'pending' || buttonStatus === 'complete'}" ng-bind="buttonName"></span>
                    <span class="fas fa-spinner fa-spin ng-class:{'hide':buttonStatus === 'initial' || buttonStatus === 'complete'}"></span>
                    <span class="fas fa-check ng-class:{'hide': buttonStatus === 'initial' || buttonStatus === 'pending'}"></span>
                </div>
            `,
            link: (scope, element, attrs) => {

                let button = element.children();
                let completeTimer = null;
                let initialTimer = null;

                scope.setup = () => {
                    angular.extend(scope, {
                        buttonName: 'Submit',
                        buttonStatus: 'initial',
                        disableBtn: false
                    });
                };

                element.bind('click', (event) => {

                    event.preventDefault();

                    if (scope.disableBtn) {
                        return;
                    }

                    scope.$apply(async () => {
                        angular.extend(scope, {
                            buttonStatus: 'pending',
                            disableBtn: true
                        });

                        let status = await scope.$eval(attrs.asyncClick);
                        if (status) {

                            $timeout.cancel(completeTimer);
                            $timeout.cancel(initialTimer);

                            completeTimer = $timeout(() => {
                                angular.extend(scope, {
                                    buttonStatus: 'complete'
                                });


                                initialTimer = $timeout(() => {
                                    angular.extend(scope, {
                                        buttonStatus: 'initial',
                                        disableBtn: false
                                    });
                                }, 1500);

                            }, 1000);

                        }
                    });


                });

                scope.setup();





            }
        }
    })
    .directive('myEnter', () => {
        return (scope, element, attrs) => {
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
    .directive('listBox', (_) => {
        return {
            restrict: 'EA',
            template: `
                <div class="animated insight well listbox-container" ng-show="listBoxReady">
                    <div class="input-group">
                        <input type="text" class="form-control input-box" my-enter="add(userInput)" ng-model="userInput" placeholder="{{uiState.placeholder}}" />
                        <div class="input-group-btn">
                            <span class="btn btn-primary" ng-click="add(userInput)" style="padding-bottom:7px">Add</span>
                        </div>
                    </div>
                    <div class="scroll-container" ng-style="scrollContainerStyle">
                        <p ng-style="noItemStyle" ng-show="items.length === 0">No items added</p>
                        <div class="animate-row listbox-items" ng-style="$last ? listBoxStyle.normal : listBoxStyle.lastchild" ng-repeat="item in items | limitTo: uiState.maxSize track by $index">
                            <div ng-style="itemStyle" ng-bind="item"></div>
                            <i class="fas fa-minus-circle text-danger clickable" ng-style="iconStyle" ng-click="remove(item)"></i>
                        </div>
                    </div>
                </div>
            `,
            scope: {
                items: '=ngModel'
            },
            link: (scope, element, attrs) => {

                angular.extend(scope, {
                    scrollContainerStyle: {
                        'position': 'relative',
                        'margin': '10px 0px 0px 0px',
                        'border-radius': '4px',
                        'background': '#FFF',
                        'border': '1px solid #ccc',
                        'overflow-y': 'scroll',
                        'height': angular.isDefined(attrs.scrollHeight) ? attrs.scrollHeight + 'px' : '200px',
                        'background': 'white'
                    },
                    listBoxStyle: {
                        normal: {
                            'display': 'flex',
                            'flex-direction': 'row',
                            'flex-wrap': 'nowrap',
                            'align-items': 'center',
                            'justify-content': 'center',
                            'padding': '5px 0px 5px 15px',
                            'margin': '0px 10px'
                        },
                        lastchild: {
                            'display': 'flex',
                            'flex-direction': 'row',
                            'flex-wrap': 'nowrap',
                            'align-items': 'center',
                            'justify-content': 'center',
                            'padding': '5px 0px 5px 15px',
                            'margin': '0px 10px',
                            'border-bottom': 'solid #bbb 1px'
                        }
                    },
                    itemStyle: {
                        'width': '95%',
                        'display': 'flex',
                        'flex-wrap': 'wrap',
                        'align-content': 'center',
                        'word-break': 'break-all'
                    },
                    noItemStyle: {
                        'margin': '15px'
                    },
                    iconStyle: {
                        'display': 'flex',
                        'align-items': 'center',
                        'height': '100%',
                        'font-size': '20px',
                        'padding': '10px'
                    }
                });

                scope.setup = () => {
                    angular.extend(scope, {
                        items: scope.items.sort(),
                        userInput: '',
                        uiState: {
                            maxSize: angular.isDefined(attrs.maxSize) ? parseInt(attrs.maxSize, 10) : 50,
                            unique: angular.isDefined(attrs.unique) ? attrs.unique == 'true' : true,
                            placeholder: angular.isDefined(attrs.placeholder) ? attrs.placeholder : '',
                        },
                        listBoxReady: true
                    });
                };

                scope.add = (userInput) => {

                    if (userInput !== '') {
                        angular.extend(scope, {
                            items: scope.uiState.unique ? _.sortedUniq((scope.items.concat(userInput)).sort()) : (scope.items.concat(userInput)).sort(),
                            userInput: ''
                        });
                    }


                };

                scope.remove = (item) => {

                    angular.extend(scope, {
                        items: _.filter(scope.items, (o) => o !== item)
                    });

                };

                scope.setup();
            }
        }
    })

export default 'custom.directive';