import uuidv4 from 'uuid/v4';

// @ngInject
export default (
    $rootScope,
    $window,
    $state,
    $scope, 
    $uibModal, 
    spService, 
    email, 
    _, 
    $async, 
    userProfile, 
    draftUserForm,
    userOS,
    modal,
    CONST) => {

    $rootScope.setPageName('QIF Abstract Form');
    
    const defaultState = {
        formID: '',
        member: {
            name: '',
            jobTitle: '',
            department: ''
        },
        uiState: {
            lastModified: '',
            disableButton: false,
            maxWordCount: 700,
            maxFileSize: 3,
            members: [],
            initialAnimationProgress: true,
            showProgressBar: false,
            progressBar: 0,
            errorFiles: []
        },
        formState: {
            metadata: {
                project_title: '',
                project_leader: '',
                contact_person: '',
                departments_involved: '',
                need_assessment: '',
                project_goals: '',
                changes_made: '',
                impact_made: '',
                discussion: '',
                green_friendly: '',
                green_friendly_describe: '',
                team_members: [],
                file_attachments: {
                    supporting: []
                },
                creator_id: userProfile.UserProfileProperties.SID.Value,
                os: angular.toJson(userOS),
                screen_size: `${$window.innerWidth} x ${$window.innerHeight}`
            },
            AttachmentFiles: []
        }
    };

    const sendConfirmationEmail = ()=>{
        if(userProfile.Email){
            email.send(
                [userProfile.Email],
                'hadqifair@mskcc.org',
                `
                    Your project for <strong>${$scope.formState.metadata.project_title}</strong> has been received. Please keep this for your record. <br>
                    Remember to complete and submit a PowerPoint presentation for a complete project submission. 
                    Both the abstract and PowerPoint presentation submissions are due on February 22, 2019.`,
                `QIF Abstract Submission`,
                (success)=>{

                },
                (failure)=>{

                }
            );
        }        
    };

    /**
     * @function This should be used when there is already a form saved on the database
     * @param {Number} formID
     * @param {String} form_status
     * @returns {Promise}
     */
    const saveForm = $async( (formID, form_status = '') => new Promise(async(resolve, reject)=>{

        if(!formID){
            reject('There needs to be a form ID to use this function');
        }
       
        let {metadata} = angular.copy($scope.formState); //NOTE: there some issue with copy with FILE type
        
        
        angular.extend(metadata, {
            form_status,
            team_members: angular.toJson($scope.uiState.members),
            file_attachments: angular.toJson(metadata.file_attachments)
        });

        await spService.updateListItem(
            CONST.rootFolder, 
            CONST.LISTS.form, 
            formID, 
            metadata
        );


        if($scope.formState.AttachmentFiles.length){
            

            let supporting = [];
            
            spService.addListFileAttachments(
                CONST.rootFolder, 
                CONST.LISTS.form,
                formID,
                {files: $scope.formState.AttachmentFiles},
                $async(async(response, index)=>{
                    
                    supporting.push({
                        name: $scope.formState.AttachmentFiles[index].name,
                        size: $scope.formState.AttachmentFiles[index].size,
                        type: $scope.formState.AttachmentFiles[index].type,
                        serverURL: response.data.d.ServerRelativeUrl
                    });

                    //uploaded all files on the server
                    if(index === $scope.formState.AttachmentFiles.length - 1){

                        let combinedFiles = []
                        if($scope.formState.metadata.file_attachments.supporting.length > 0){
                            
                            combinedFiles = [...$scope.formState.metadata.file_attachments.supporting, ...supporting];

                        } else {
                            combinedFiles = [...supporting];
                        }

                        await spService.updateListItem(CONST.rootFolder, CONST.LISTS.form, formID, 
                            {
                                file_attachments: angular.toJson({
                                    supporting: combinedFiles
                                }),
                                has_supporting_documents: combinedFiles.length > 0 ? 'Yes' : 'No'
                            }
                        );

                        angular.merge($scope, {
                            uiState: {
                                lastModified: new Date().toISOString(), 
                                showProgressBar: false,
                                disableButton: false,
                                errorFiles: [],
                                maxFileSize: defaultState.uiState.maxFileSize - combinedFiles.length
                            },
                            formState: {
                                metadata: {
                                    file_attachments: {
                                        supporting: combinedFiles
                                    }
                                }
                            }
                        });                            

                        $scope.formState.AttachmentFiles = [];
                        resolve(true);

                    }
                }),
                (uploadStatus)=>{
                    angular.extend($scope.uiState, {
                        progressBar: uploadStatus,
                        showProgressBar: true,
                        initialAnimationProgress: false
                    }); 
                }
            );


        } else {
            
            angular.extend($scope.uiState, {
                lastModified: new Date().toISOString(),
                disableButton: false
            });
            resolve(true);
        }

    }));    

    $scope.removeFileFromServer = $async(async(fileName)=>{
        try {
            const fileAttachments = $scope.formState.metadata.file_attachments;
            const filteredFiles = fileAttachments.supporting.filter((file)=>file.name !== fileName);
        
            await spService.deleteListFileAttachment(CONST.rootFolder, CONST.LISTS.form, $scope.formID, fileName);
            
            await spService.updateListItem(CONST.rootFolder, CONST.LISTS.form, $scope.formID, {
                file_attachments: angular.toJson({
                    supporting: filteredFiles
                })
            });

            angular.extend($scope.uiState, {
                maxFileSize: defaultState.uiState.maxFileSize - filteredFiles.length
            });

            angular.extend(fileAttachments, {
                supporting: filteredFiles
            });

            

        } catch(err){

        }
    });

    $scope.removeMember = (id) => {
        const updatedMembers = $scope.uiState.members.filter((member)=>member.id !== id);
        angular.extend($scope.uiState, {
            members: updatedMembers
        });
    };

    //this should clear attachment not on the server yet
    $scope.clearAttachments = () => {

        angular.extend($scope.uiState, {
            errorFiles: []
        });

        angular.extend($scope.formState, {
            AttachmentFiles: []
        });

    };    

    $scope.addMember = (member) => {
        if(member.name && member.jobTitle && member.department){
        
            angular.merge($scope,{
                member: defaultState.member,
                uiState: {
                    members: [...$scope.uiState.members, {id:uuidv4(), ...member}]
                }
            });
    
        } else {
            let modalInstance = $uibModal.open({
                animation: true,
                controller: ($scope, $uibModalInstance)=>{
                    $scope.closeModal = () => {
                        $uibModalInstance.close('close');
                    };
                },
                template: `
                    <div>
                        <header class="modal-header">
                            <button ng-click="closeModal()" type="button" class="close"><i class="fas fa-times"></i></button>
                        </header>
                        <main class="modal-body">
                            <div class="alert alert-danger"><span class="fas fa-exclamation"></span> Do not leave fields blank when adding a member.</div> 
                        </main>
                        <footer class="modal-footer">
                        </footer>
                    </div>       
                `,
                size: 'md'
            });
    
            modalInstance.result.then(
                () => {
                },
                () => {
    
                }
            );                 
        }
  
    };

    $scope.saveForm = $async(async()=>{

        //this prevents double submit
        if($scope.uiState.disableButton){
            return;
        }

        angular.extend($scope.uiState, {
            disableButton: true
        });

        //THERE SHOULD BE TWO STATES HERE FOR SAVING FIRST TIME AND SAVING AGAIN
        if(draftUserForm || $scope.formID) {
            //HAVE PREVIOUS SAVED ENTRY
            await saveForm($scope.formID, 'draft');
            $window.scrollTo(0,document.body.scrollHeight);
        } else {
            //NEW ENTRY ONLY
            
            let supporting = [];
            let {metadata} = angular.copy($scope.formState); //prevent mutating the main state

            //merge for if no form exists yet
            
            angular.extend(metadata, {
                form_status: 'draft',
                has_supporting_documents: $scope.formState.AttachmentFiles.length ? 'Yes' : 'No',
                team_members: angular.toJson($scope.uiState.members),
                file_attachments: angular.toJson(metadata.file_attachments)
            });

            spService.addListItem(CONST.rootFolder, CONST.LISTS.form, {metadata, AttachmentFiles: $scope.formState.AttachmentFiles},
                (response)=>{
                    //this only runs when there is no files
                    if($scope.formState.AttachmentFiles.length === 0){

                        angular.merge($scope, {
                            formID: response.data.d.ID,
                            uiState: {
                                lastModified: response.data.d.Modified,
                                disableButton: false
                            }
                        });

                        
                    } else {
                        angular.extend($scope.uiState, {
                            lastModified: response.data.d.Modified,
                            disableButton: false
                        });
                    }

                    $window.scrollTo(0,document.body.scrollHeight);

                },
                (error)=>{
    
                },
                $async(async(documentID, response, index)=>{
                    //this will only run if there are files
                    supporting.push({
                        name: $scope.formState.AttachmentFiles[index].name,
                        size: $scope.formState.AttachmentFiles[index].size,
                        type: $scope.formState.AttachmentFiles[index].type,
                        serverURL: response.data.d.ServerRelativeUrl
                    });
                    
                    //used this to handle which files got finish uploading
                    if( ++index === $scope.formState.AttachmentFiles.length){
    
                        await spService.updateListItem(CONST.rootFolder, CONST.LISTS.form, documentID, {
                            file_attachments: angular.toJson({
                                supporting
                            })
                        });

                        //mutate the state
                        angular.merge($scope, {
                            formID: documentID,
                            uiState: {
                                showProgressBar: false,
                                disableButton: false
                            },
                            formState: {
                                metadata: {
                                    file_attachments: {
                                        supporting
                                    }
                                }
                            }
                        });

                        $scope.formState.AttachmentFiles = [];
                        $window.scrollTo(0,document.body.scrollHeight);

    
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

        }

    });

    $scope.downloadFile = (serverURL, type)=>{
        spService.downloadAttachment(serverURL, {type});
    };

    $scope.finalSubmit = $async(async(e)=>{
        e.preventDefault();

        if($scope.uiState.members.length === 0){
            return modal.displayWarning('You must add at least one team member', ()=>{
                document.querySelector('#team-members').scrollIntoView();
            });
        }

        if($scope.uiState.disableButton){
            return;
        }

        angular.extend($scope.uiState, {
            disableButton: true
        });        

        if(draftUserForm || $scope.formID) {
            await saveForm($scope.formID, 'completed');

            sendConfirmationEmail();
            $state.go('complete');

        } else {
            //Submitting a form without saving
            let {metadata} = angular.copy($scope.formState);
            let supporting = [];

            //making a copy of $scope to prevent mutation of that data

            angular.extend(metadata, {
                form_status: 'complete',
                team_members: angular.toJson($scope.uiState.members),
                has_supporting_documents: $scope.formState.AttachmentFiles.length ? 'Yes' : 'No',
                file_attachments: angular.toJson(metadata.file_attachments)
            });

            spService.addListItem(CONST.rootFolder, CONST.LISTS.form, {metadata, AttachmentFiles: $scope.formState.AttachmentFiles},
                (response)=>{
                    //this only runs when there is no files
                    if($scope.formState.AttachmentFiles.length === 0){

                        sendConfirmationEmail();
                        $state.go('complete');
                    }
                },
                (error)=>{
    
                },
                $async(async(documentID, response, index)=>{

                    supporting.push({
                        name: $scope.formState.AttachmentFiles[index].name,
                        size: $scope.formState.AttachmentFiles[index].size,
                        type: $scope.formState.AttachmentFiles[index].type,
                        serverURL: response.data.d.ServerRelativeUrl
                    });
                                        
                    //used this to handle which files got finish uploading
                    if( ++index === $scope.formState.AttachmentFiles.length){
                        angular.extend($scope.uiState, {
                            showProgressBar: false
                        });
    
                        //after files completed uploading update the database on the server
                        await spService.updateListItem(
                            CONST.rootFolder, 
                            CONST.LISTS.form, 
                            documentID, 
                            {
                                file_attachments: angular.toJson({
                                    supporting
                                })
                            }
                        );

                        sendConfirmationEmail();
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
        }

    });

    $scope.uploadFiles = (files, invalid) => {

        const filesOnServer = $scope.formState.metadata.file_attachments.supporting.map(file=>file.name);

        angular.extend($scope.uiState, {
            errorFiles: invalid.length > 0 ? invalid.filter(({name})=>!filesOnServer.includes(name)) : []
        });

        angular.extend($scope.formState, {
            AttachmentFiles: files.filter(({name})=>!filesOnServer.includes(name))
        });

    };

    $scope.init = $async(async()=>{                                                                                                                                                                                                                                                              
        //a user form exist so it will overwrite the defaults
        if(draftUserForm){
            angular.merge($scope, {
                formID: draftUserForm.ID,
                member: defaultState.member,
                uiState: {
                    ...defaultState.uiState,
                    members: draftUserForm.team_members,
                    lastModified: draftUserForm.Modified,
                    maxFileSize: defaultState.uiState.maxFileSize - draftUserForm.file_attachments.supporting.length //does the difference between files on server and file that will be attached
                },
                formState: {
                    metadata: {
                        project_title: draftUserForm.project_title,
                        project_leader: draftUserForm.project_leader,
                        contact_person: draftUserForm.contact_person,
                        team_members: draftUserForm.team_members,
                        departments_involved: draftUserForm.departments_involved,
                        need_assessment: draftUserForm.need_assessment,
                        project_goals: draftUserForm.project_goals,
                        changes_made: draftUserForm.changes_made,
                        impact_made: draftUserForm.impact_made,
                        discussion: draftUserForm.discussion,
                        green_friendly: draftUserForm.green_friendly,
                        green_friendly_describe: draftUserForm.green_friendly_describe,
                        file_attachments: draftUserForm.file_attachments           
                    },
                    AttachmentFiles: []
                }
            });
        } else {
            //doing a deep copy to prevent obj1 === obj2 true
            angular.merge($scope, defaultState);
        }
    });

    $scope.init();

};