import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import axios from 'axios';


import {projectTitleInitialState} from '../reducers/project-title';
import {showStandardAlert, closeAlertWithId} from '../reducers/alerts';

import EntConfig from '../config/ent-config';
import downloadBlob from '../lib/download-blob';
/**
 * Project saver component passes a downloadProject function to its child.
 * It expects this child to be a function with the signature
 *     function (downloadProject, props) {}
 * The component can then be used to attach project saving functionality
 * to any other component:
 *
 * <SB3Downloader>{(downloadProject, props) => (
 *     <MyCoolComponent
 *         onClick={downloadProject}
 *         {...props}
 *     />
 * )}</SB3Downloader>
 */
class SB3Downloader extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'downloadProject',
            'updateProjectToEnt'
        ]);
    }
    downloadProject () {
        this.props.saveProjectSb3().then(content => {
            if (this.props.onSaveFinished) {
                this.props.onSaveFinished();
            }
            // sauvegarde du fichier
            downloadBlob(this.props.projectFilename, content);
        });
    }
    updateProjectToEnt () {
        // update project (saving) (.sb3) to ENT
        const _this = this;
        this.props.saveProjectSb3().then(content => {
            if (this.props.onSaveFinished) {
                this.props.onSaveFinished();
            }

            this.props.openSavingModal();

            const reader = new FileReader();
            reader.readAsDataURL(content);
            reader.onloadend = () => {
                const readerRes = reader.result;

                const mimetypes = /base64,(.+)/.exec(readerRes)[0].split(':')[1];
                const base64data = /base64,(.+)/.exec(readerRes)[1];

                const projectIdUrl = new URL(_this.props.reduxProjectId);
                const entUrl = EntConfig.ENT_URL;
                const entId = projectIdUrl.href.split('/').pop();

                const base64basic = window.btoa(
                    unescape(
                        encodeURIComponent(`${EntConfig.AUTH_BASIC_LOGIN}:${EntConfig.AUTH_BASIC_PASSWORD}`)
                    )
                );

                // update
                axios.put(`${entUrl}scratch/file?ent_id=${entId}`, {
                    name: this.props.projectFilename,
                    mimetypes: mimetypes,
                    content: base64data,
                    format: 'base64'
                }, {
                    headers: {
                        Authorization: `Basic ${base64basic}`
                    }
                }).then(res => {
                    if (res && res.status >= 200 && res.status < 300) {
                        this.props.openSaveSuccessModal();
                    } else {
                        this.props.openSaveFailedModal();
                    }
                }).catch(() => {
                    this.props.openSaveFailedModal();
                });
            };
        });
    }
    render () {
        const {
            children
        } = this.props;

        return children(
            this.props.className,
            this.props.useEntSave ? this.updateProjectToEnt : this.downloadProject
        );
    }
}

const getProjectFilename = (curTitle, defaultTitle) => {
    let filenameTitle = curTitle;
    if (!filenameTitle || filenameTitle.length === 0) {
        filenameTitle = defaultTitle;
    }
    return `${filenameTitle.substring(0, 100)}.sb3`;
};

SB3Downloader.propTypes = {
    children: PropTypes.func,
    className: PropTypes.string,
    onSaveFinished: PropTypes.func,
    projectFilename: PropTypes.string,
    saveProjectSb3: PropTypes.func,
    useEntSave: PropTypes.bool,
    reduxProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    openSavingModal: PropTypes.func,
    openSaveSuccessModal: PropTypes.func,
    openSaveFailedModal: PropTypes.func,
    closeSaveSuccessModal: PropTypes.func
};

SB3Downloader.defaultProps = {
    className: ''
};

const mapDispatchToProps = dispatch => ({
    openSavingModal: () => {
        dispatch(showStandardAlert('savingEnt'));
    },
    openSaveSuccessModal: () => {
        dispatch(showStandardAlert('savingEntSuccess'));
    },
    openSaveFailedModal: () => {
        dispatch(showStandardAlert('savingEntError'));
    },
    closeSaveSuccessModal: () => {
        dispatch(closeAlertWithId('savingEnt'));
    }
});

const mapStateToProps = state => ({
    saveProjectSb3: state.scratchGui.vm.saveProjectSb3.bind(state.scratchGui.vm),
    reduxProjectId: state.scratchGui.projectState.projectId,
    projectFilename: getProjectFilename(state.scratchGui.projectTitle, projectTitleInitialState)
});

// Allow incoming props to override redux-provided props. Used to mock in tests.
const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
    {}, stateProps, dispatchProps, ownProps
);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    () => ({}) // omit dispatch prop
)(SB3Downloader);
