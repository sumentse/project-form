// @ngInject
angular.module('form.directive', [])
    .directive('formTextBox', ($compile)=>{
        return {
            restrict: "EA",
            replace: true,
            scope: {
                model: '=ngModel'
            },
            link: (scope, element, attrs)=>{

                let currentElement = element;

                //custom for this form. This can be removed.
                attrs.$observe('required',(val)=>{
                    if(val === 'Yes'){
                        attrs['required'] = true;
                        scope.setup();
                    } 

                    if(val === 'No' || val === ''){
                        attrs['required'] = false;
                        scope.setup();
                    }

                });

                angular.extend(scope, {
                    wordCounterStyle: {
                        right: '1.5rem',
                        bottom: '.5rem'
                    },
                    textBoxStyle: {
                        'min-height': '10rem'
                    }
                });

                scope.setup = () => {
                    angular.extend(scope, {
                        uiState: {
                            name: attrs.name,
                            label: attrs.label,
                            isRequired: attrs.required ? true : false,
                            description: attrs.description,
                            maxWordCount: attrs.maxWordCount
                        }
                    });

                    const showRequired = scope.uiState.isRequired ? '<span class="text-danger">*</span>' : '';

                    const content = `
                        <div class="form-group">
                        <label for={{uiState.name}}><span ng-bind="uiState.label"></span> ${showRequired}</label>
                        <div class="textarea-container position-relative">
                            <textarea id={{uiState.name}}
                                    ng-style={{textBoxStyle}}
                                    max-words={{uiState.maxWordCount}}
                                    class="form-control"
                                    ng-model="model"
                                    ng-model-options="{allowInvalid: true}"
                                    ng-required={{uiState.isRequired}}
                                    ng-trim="true"></textarea>
                            <span ng-style={{wordCounterStyle}} class="character-counter badge badge-secondary position-absolute">
                                Word Count:
                                <span ng-bind="model | wordCounter"></span>/<span ng-bind="uiState.maxWordCount"></span>
                            </span>
                        </div>
                        <small ng-if="uiState.description" class="form-text text-muted" ng-bind="uiState.description"></small>
                        </div>            
                    `;

                    //this will get rid of that directive definition
                    const replacementElement = angular.element(content);
                    currentElement.replaceWith(replacementElement);
                    currentElement = replacementElement;


                    $compile(replacementElement)(scope);
                };

                scope.setup();
            },
        }
    })
    .directive('maxWords', ($filter) => {
        return {
            restrict: "A",
            scope: {
                model: '=ngModel'
            },
            link: (scope, element, attrs) => {

                const userDefinedMaxWord = parseInt(attrs.maxWords, 10);

                scope.$watch('model', (newValue,oldValue) => {

                    const totalWordCount = $filter('wordCounter')(newValue);

                    if(totalWordCount > userDefinedMaxWord){
                        scope.model = oldValue;
                    }
                    
                });

                

            }
        }
    })

export default 'form.directive';