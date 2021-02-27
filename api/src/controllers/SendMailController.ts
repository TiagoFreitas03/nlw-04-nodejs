import {Request, Response} from 'express';
import {resolve} from 'path';
import {getCustomRepository} from 'typeorm';
import {SurveysRepository} from '../repositories/SurveysRepository';
import {UsersRepository} from '../repositories/UsersRepository';
import {SurveysUsersRepository} from '../repositories/SurveysUsersRepository';
import SendMailService from '../services/SendMailService';
import { SurveyUser } from '../models/SurveyUser';

class SendMailController {
	
	async execute(request: Request, response: Response) {
		const {email, survey_id} = request.body;

		const usersRepository = getCustomRepository(UsersRepository);
		const surveysRepository = getCustomRepository(SurveysRepository);
		const surveysUsersRepository = getCustomRepository(SurveysUsersRepository)

		const user = await usersRepository.findOne({email});

		if (!user) {
			return response.status(400).json({
				error: "User does not exists",
			});
		}

		const survey = await surveysRepository.findOne({id: survey_id});

		if (!survey) {
			return response.status(400).json({
				error: "Survey does not exists",
			});
		}

		const npsPath = resolve(__dirname, '..', 'views', 'emails', 'npsMail.hbs');

		const surveyUserExists = await surveysUsersRepository.findOne({
			where: {user_id: user.id, value: null},
			relations: ["user", "survey"],
		});

		const variables = {
			name: user.name,
			title: survey.title,
			description: survey.description,
			id: "",
			link: process.env.URL_MAIL
		};

		if (surveyUserExists) {
			variables.id = surveyUserExists.id;
			await SendMailService.execute(email, survey.title, variables, npsPath);
			return response.json(surveyUserExists);
		}

		const surveyUser = surveysUsersRepository.create({
			user_id: user.id,
			survey_id
		});

		await surveysUsersRepository.save(surveyUser);

		variables.id = surveyUser.id;
		await SendMailService.execute(email, survey.title, variables, npsPath);

		return response.json(surveyUser);
	}

}

export {SendMailController}