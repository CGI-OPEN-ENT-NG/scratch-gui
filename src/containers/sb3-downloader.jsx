import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {projectTitleInitialState} from '../reducers/project-title';
import downloadBlob from '../lib/download-blob';
import axios from 'axios';

import EntConfig from '../config/ent-config';

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
            const reader = new FileReader();
            reader.readAsDataURL(content);
            reader.onloadend = () => {
                const res = reader.result;

                const mimetypes = /base64,(.+)/.exec(res)[0].split(':')[1];
                const base64data = /base64,(.+)/.exec(res)[1];

                const projectIdUrl = new URL(_this.props.reduxProjectId);
                const entUrl = projectIdUrl.host;
                const entId = projectIdUrl.split('/').pop();

                const authBasicLogin = EntConfig.AUTH_BASIC_LOGIN;
                const authBasicPassword = EntConfig.AUTH_BASIC_PASSWORD;
                const entUsername = EntConfig.ENT_USERNAME;
                const entUserId = EntConfig.ENT_USER_ID;

                const base64basic = window.btoa(unescape(encodeURIComponent(`${authBasicLogin}:${authBasicPassword}`)));

                // update
                axios.put(`${entUrl}/scratch/file?ent_id=${entId}`, {
                    name: this.props.projectFilename,
                    mimetypes: mimetypes,
                    content: base64data
                }, {
                    headers: {
                        'Authorization': `Basic ${base64basic}`,
                        'User-Name': entUsername,
                        'User-Id': entUserId
                    }
                }).then(() => {

                }).catch(() => {
                    // console.error(err);
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
    reduxProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};
SB3Downloader.defaultProps = {
    className: ''
};

const mapStateToProps = state => ({
    saveProjectSb3: state.scratchGui.vm.saveProjectSb3.bind(state.scratchGui.vm),
    projectFilename: getProjectFilename(state.scratchGui.projectTitle, projectTitleInitialState)
});

export default connect(
    mapStateToProps,
    () => ({}) // omit dispatch prop
)(SB3Downloader);
