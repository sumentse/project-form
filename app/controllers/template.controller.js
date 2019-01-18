// @ngInject
export default ($rootScope, $state, $scope, spService, email, $async, CONST, userProfile, modal) => {
    
    $rootScope.setPageName('Template Submission Form');

    const defaultState = {
        uiState: {
            disableButton: false,
            initialAnimationProgress: true,
            showProgressBar: false,
            progressBar: 0
        },
        formState: {
            metadata: {
                Title: ''
            },
            AttachmentFiles: []
        }
    };

    const sendConfirmationEmail = () => {
        email.send(
            [userProfile.Email],
            null,
            `Your presentation for <strong>${$scope.formState.metadata.Title}</strong> has been received. Please keep this for your record.`,
            `QIF Template Submission`,
            (success)=>{

            },
            (failure)=>{

            }
        );
    };
    
    $scope.submitForm = (event) => {
        event.preventDefault();

        if($scope.formState.AttachmentFiles.length === 0){
            modal.displayWarning('You need to attach your project file before submitting.');
            return;
        }

        if($scope.uiState.disableButton){
            return;
        }
        
        angular.extend($scope.uiState, {
            disableButton: true
        });

        spService.addListItem(CONST.rootFolder, CONST.LISTS.template, $scope.formState, 
            (response)=>{
                //no point to use this if there will be a file attachment
            },
            (error)=>{

            },
            $async(async(documentID, response, index)=>{
                if( ++index === $scope.formState.AttachmentFiles.length){
                    angular.extend($scope.uiState, {
                        showProgressBar: false
                    });

                    if(userProfile.Email){
                        sendConfirmationEmail();
                    }                    

                    $state.go('complete');
                }
            }),
            (uploadStatus = 0)=>{
                angular.extend($scope.uiState, {
                    progressBar: uploadStatus,
                    showProgressBar: true,
                    initialAnimationProgress: false
                });
            }
        );

    };

    $scope.uploadFiles = (file, invalid) => {

        if(invalid){
            displayModal('The file size is too large. Please keep it under 50MB.');
            angular.extend($scope.formState, {
                AttachmentFiles: []
            });
        } else {
            angular.extend($scope.formState, {
                AttachmentFiles: [file]
            });
        }

    };

    $scope.init = ()=>{
        angular.merge($scope, defaultState);
    };

    $scope.init();


};
